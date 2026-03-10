import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session

from ..db.models import SubtitleTask
from ..db.session import get_session
from ..services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=SubtitleTask)
async def create_download_task(
    title: str, source_url: str, background_tasks: BackgroundTasks, session: Session = Depends(get_session)
):
    """创建下载任务"""
    task = TaskService.create_task(session, title, source_url)
    background_tasks.add_task(TaskService.run_download_task, task.id)
    return task


@router.get("/{task_id}", response_model=SubtitleTask)
async def get_task_status(task_id: int, session: Session = Depends(get_session)):
    """查询任务状态"""
    task = TaskService.get_task(session, task_id)
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
    items, total = TaskService.list_tasks(session, offset, limit, status)
    return {"total": total, "offset": offset, "limit": limit, "items": items}


@router.delete("/{task_id}")
async def delete_task(task_id: int, delete_files: bool = False, session: Session = Depends(get_session)):
    """删除任务"""
    success = TaskService.delete_task(session, task_id, delete_files)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "ok", "message": f"Task {task_id} deleted"}


@router.post("/{task_id}/retry", response_model=SubtitleTask)
async def retry_task(task_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """重试失败的任务"""
    task = TaskService.retry_task(session, task_id)
    if not task:
        raise HTTPException(status_code=400, detail="Only failed tasks can be retried or task not found")

    background_tasks.add_task(TaskService.run_download_task, task.id)
    return task


@router.post("/clear-completed")
async def clear_completed_tasks(session: Session = Depends(get_session)):
    """清理已完成的任务记录"""
    cleared = TaskService.clear_completed(session)
    return {"status": "ok", "cleared_count": cleared}
