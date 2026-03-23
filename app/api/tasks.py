import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends, Query
from sqlmodel import Session

from ..db.models import SubtitleTask
from ..db.session import get_session
from ..services.task_service import TaskService
from .errors import raise_for_service_error
from .schemas import ActionResponse, TaskCreateRequest

router = APIRouter(prefix="/tasks", tags=["Tasks"])
logger = logging.getLogger(__name__)


def _resolve_task_create_request(
    payload: Optional[TaskCreateRequest],
    title: Optional[str],
    source_url: Optional[str],
    target_path: Optional[str],
    target_type: Optional[str],
    season: Optional[int],
    episode: Optional[int],
    language: Optional[str],
) -> TaskCreateRequest:
    if payload is not None:
        return payload
    if not title or not source_url:
        raise ValueError("title and source_url are required")
    return TaskCreateRequest(
        title=title,
        source_url=source_url,
        target_path=target_path,
        target_type=target_type,
        season=season,
        episode=episode,
        language=language,
    )


@router.post("/", response_model=SubtitleTask)
async def create_download_task(
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    payload: Optional[TaskCreateRequest] = Body(default=None),
    title: Optional[str] = Query(default=None, min_length=1),
    source_url: Optional[str] = Query(default=None, min_length=1),
    target_path: Optional[str] = Query(default=None),
    target_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    season: Optional[int] = Query(default=None, ge=1),
    episode: Optional[int] = Query(default=None, ge=1),
    language: Optional[str] = Query(default=None),
):
    """创建下载任务"""
    try:
        request = _resolve_task_create_request(
            payload, title, source_url, target_path, target_type, season, episode, language
        )
        task = TaskService.create_task(
            session,
            request.title,
            request.source_url,
            target_path=request.target_path,
            target_type=request.target_type,
            season=request.season,
            episode=request.episode,
            language=request.language,
        )
    except Exception as exc:
        raise_for_service_error(exc)

    background_tasks.add_task(TaskService.run_download_task, task.id)
    return task


@router.get("/{task_id}", response_model=SubtitleTask)
async def get_task_status(task_id: int, session: Session = Depends(get_session)):
    """查询任务状态"""
    task = TaskService.get_task(session, task_id)
    if not task:
        raise_for_service_error(LookupError("Task not found"))
    return task


@router.get("/")
async def list_tasks(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    """分页列出任务"""
    items, total = TaskService.list_tasks(session, offset, limit, status)
    return {"total": total, "offset": offset, "limit": limit, "items": items}


@router.delete("/{task_id}", response_model=ActionResponse)
async def delete_task(task_id: int, delete_files: bool = False, session: Session = Depends(get_session)):
    """删除任务"""
    success = TaskService.delete_task(session, task_id, delete_files)
    if not success:
        raise_for_service_error(LookupError("Task not found"))
    return ActionResponse(message=f"Task {task_id} deleted")


@router.post("/{task_id}/retry", response_model=SubtitleTask)
async def retry_task(task_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """重试失败的任务"""
    existing_task = TaskService.get_task(session, task_id)
    if not existing_task:
        raise_for_service_error(LookupError("Task not found"))

    task = TaskService.retry_task(session, task_id)
    if not task:
        raise_for_service_error(ValueError("Only failed tasks can be retried"))

    background_tasks.add_task(TaskService.run_download_task, task.id)
    return task


@router.post("/clear-completed", response_model=ActionResponse)
async def clear_completed_tasks(session: Session = Depends(get_session)):
    """清理已完成的任务记录"""
    cleared = TaskService.clear_completed(session)
    return ActionResponse(message=f"Cleared {cleared} completed tasks", cleared_count=cleared)
