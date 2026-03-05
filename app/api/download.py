import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SubtitleTask
from ..db.session import get_session

router = APIRouter(prefix="/download", tags=["Download"])
logger = logging.getLogger(__name__)


from ..core.archive import ArchiveManager

async def run_download_task(task_id: int, session: Session):
    """后台下载任务逻辑"""
    task = session.get(SubtitleTask, task_id)
    if not task:
        return

    agent = ZimukuAgent()
    try:
        task.status = "downloading"
        task.updated_at = datetime.now()
        session.add(task)
        session.commit()

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
                extracted_files = ArchiveManager.extract(file_path, extract_to)
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
        session.add(task)
        session.commit()
        await agent.close()


@router.post("/")
async def create_download_task(
    title: str, 
    source_url: str, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session)
):
    """创建下载任务"""
    task = SubtitleTask(title=title, source_url=source_url)
    session.add(task)
    session.commit()
    session.refresh(task)

    background_tasks.add_task(run_download_task, task.id, session)
    return {"task_id": task.id, "status": task.status}


@router.get("/{task_id}")
async def get_task_status(task_id: int, session: Session = Depends(get_session)):
    """查询任务状态"""
    task = session.get(SubtitleTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/")
async def list_tasks(limit: int = 10, session: Session = Depends(get_session)):
    """列出最近的任务"""
    statement = select(SubtitleTask).order_by(SubtitleTask.created_at.desc()).limit(limit)
    return session.exec(statement).all()
