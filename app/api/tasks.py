import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session, desc, func, select

from ..core.archive import ArchiveManager
from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SubtitleTask
from ..db.session import get_session

router = APIRouter(prefix="/tasks", tags=["Tasks"])
logger = logging.getLogger(__name__)


async def run_download_task(task_id: int, session_data: Session):
    """后台下载任务逻辑"""
    # 重新获取 session 以确保事务一致性 (后台任务中直接用外部 session 可能有问题，建议使用 sessionmaker)
    # 但这里简单起见，直接用传入的 session
    task = session_data.get(SubtitleTask, task_id)
    if not task:
        return

    agent = ZimukuAgent()
    try:
        task.status = "downloading"
        task.updated_at = datetime.now()
        session_data.add(task)
        session_data.commit()

        # 1. 获取下载页链接
        dld_links = await agent.get_download_page_links(task.source_url)
        if not dld_links:
            raise Exception("未能提取到下载链接")

        # 2. 执行下载
        referer = task.source_url.replace("/detail/", "/dld/")
        download_url = dld_links[0]

        filename, content = await agent.download_file(download_url, referer)
        if not filename or not content:
            raise Exception("文件下载失败，返回内容为空")

        # 3. 保存原始文件
        storage_path = ConfigManager.get("storage_path", "storage/downloads")
        os.makedirs(storage_path, exist_ok=True)

        file_path = os.path.join(storage_path, filename)
        with open(file_path, "wb") as f:
            f.write(content)

        # 4. 解压处理
        if ArchiveManager.is_archive(filename):
            extract_to = os.path.join(storage_path, os.path.splitext(filename)[0])
            try:
                ArchiveManager.extract(file_path, extract_to)
                # 更新任务状态，记录解压路径
                task.save_path = extract_to
                logger.info(f"成功解压到: {extract_to}")
            except Exception as e:
                logger.error(f"解压失败: {e}")
                # 即使解压失败，下载也算成功，但记录错误
                task.error_msg = f"Download OK, but extraction failed: {e}"
        else:
            task.save_path = file_path

        task.status = "completed"
        task.filename = filename

    except Exception as e:
        logger.error(f"下载任务 {task_id} 失败: {e}")
        task.status = "failed"
        task.error_msg = str(e)
    finally:
        task.updated_at = datetime.now()
        session_data.add(task)
        session_data.commit()
        await agent.close()


@router.post("/", response_model=SubtitleTask)
async def create_download_task(
    title: str, source_url: str, background_tasks: BackgroundTasks, session: Session = Depends(get_session)
):
    """创建下载任务"""
    task = SubtitleTask(title=title, source_url=source_url)
    session.add(task)
    session.commit()
    session.refresh(task)

    background_tasks.add_task(run_download_task, task.id, session)
    return task


@router.get("/{task_id}", response_model=SubtitleTask)
async def get_task_status(task_id: int, session: Session = Depends(get_session)):
    """查询任务状态"""
    task = session.get(SubtitleTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/")
async def list_tasks(
    offset: int = 0,
    limit: int = Query(default=10, le=100),
    status: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """分页列出任务"""
    statement = select(SubtitleTask).order_by(desc(SubtitleTask.created_at))
    if status:
        statement = statement.where(SubtitleTask.status == status)

    # 获取总数
    count_statement = select(func.count()).select_from(SubtitleTask)
    if status:
        count_statement = count_statement.where(SubtitleTask.status == status)
    total = session.exec(count_statement).one()

    results = session.exec(statement.offset(offset).limit(limit)).all()
    return {"total": total, "offset": offset, "limit": limit, "items": results}


@router.delete("/{task_id}")
async def delete_task(task_id: int, delete_files: bool = False, session: Session = Depends(get_session)):
    """删除任务"""
    task = session.get(SubtitleTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if delete_files and task.save_path and os.path.exists(task.save_path):
        try:
            if os.path.isdir(task.save_path):
                import shutil

                shutil.rmtree(task.save_path)
            else:
                os.remove(task.save_path)
            logger.info(f"已删除任务关联文件: {task.save_path}")
        except Exception as e:
            logger.error(f"删除文件失败: {e}")

    session.delete(task)
    session.commit()
    return {"status": "ok", "message": f"Task {task_id} deleted"}


@router.post("/{task_id}/retry", response_model=SubtitleTask)
async def retry_task(task_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """重试失败的任务"""
    task = session.get(SubtitleTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed tasks can be retried")

    task.status = "pending"
    task.error_msg = None
    task.updated_at = datetime.now()
    session.add(task)
    session.commit()
    session.refresh(task)

    background_tasks.add_task(run_download_task, task.id, session)
    return task


@router.post("/clear-completed")
async def clear_completed_tasks(session: Session = Depends(get_session)):
    """清理已完成的任务记录"""
    statement = select(SubtitleTask).where(SubtitleTask.status == "completed")
    tasks = session.exec(statement).all()
    count = len(tasks)
    for task in tasks:
        session.delete(task)
    session.commit()
    return {"status": "ok", "cleared_count": count}
