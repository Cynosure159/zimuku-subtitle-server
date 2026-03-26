from typing import List, Optional, TypeVar

from fastapi import APIRouter, BackgroundTasks, Body, Depends, Query
from fastapi.responses import FileResponse
from sqlmodel import Session

from ..db.models import MediaPath, ScannedFile
from ..db.session import get_session
from ..services.media_service import MediaService, global_task_status
from ..services.metadata_service import MetadataService
from .errors import raise_for_service_error
from .schemas import ActionResponse, MediaMetadataResponse, SeasonMatchRequest, TaskTriggerResponse

router = APIRouter(prefix="/media", tags=["Media"])
T = TypeVar("T")


def _build_trigger_response(message: str, task_kind: str, target: Optional[str] = None) -> TaskTriggerResponse:
    return TaskTriggerResponse(message=message, task_kind=task_kind, target=target)


def _require_resource(resource: T | None, detail: str) -> T:
    if resource is None:
        raise_for_service_error(LookupError(detail))

    return resource


@router.get("/task-status")
async def get_task_status() -> dict:
    """获取当前的后台任务状态"""
    return global_task_status.to_dict()


@router.get("/paths", response_model=List[MediaPath])
async def list_media_paths(session: Session = Depends(get_session)) -> List[MediaPath]:
    """获取所有媒体库扫描路径"""
    return MediaService.list_paths(session)


@router.post("/paths", response_model=MediaPath)
async def add_media_path(
    path: str,
    path_type: str = Query(default="movie", pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
) -> MediaPath:
    """添加媒体库扫描路径"""
    try:
        return MediaService.add_path(session, path, path_type)
    except Exception as exc:
        raise_for_service_error(exc)


@router.delete("/paths/{path_id}", response_model=ActionResponse)
async def delete_media_path(path_id: int, session: Session = Depends(get_session)) -> ActionResponse:
    """删除媒体库扫描路径"""
    success = MediaService.delete_path(session, path_id)
    if not success:
        raise_for_service_error(LookupError("Path not found"))
    return ActionResponse(message=f"Path {path_id} and its associated files deleted")


@router.patch("/paths/{path_id}", response_model=MediaPath)
async def update_media_path(
    path_id: int,
    enabled: Optional[bool] = None,
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
) -> MediaPath:
    """更新媒体库扫描路径配置"""
    updated = MediaService.update_path(session, path_id, enabled, path_type)
    if not updated:
        raise_for_service_error(LookupError("Path not found"))
    return updated


@router.get("/files", response_model=List[ScannedFile])
async def list_scanned_files(
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    offset: int = Query(default=0, ge=0),
    limit: Optional[int] = Query(default=None, ge=1, le=1000),
    session: Session = Depends(get_session),
) -> List[ScannedFile]:
    """获取已扫描的媒体文件列表"""
    return MediaService.list_files_paginated(session, path_type, offset, limit)


@router.post("/files/{file_id}/auto-match", response_model=TaskTriggerResponse)
async def auto_match_single_file(
    file_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)
) -> TaskTriggerResponse:
    """针对单个视频文件触发全自动搜索、下载与归档逻辑"""
    file_record = _require_resource(MediaService.get_file(session, file_id), "File not found")

    background_tasks.add_task(MediaService.run_auto_match_process, file_id)
    return _build_trigger_response(
        message=f"Full auto-match process for '{file_record.filename}' started",
        task_kind="auto_match",
        target=str(file_id),
    )


@router.post("/tv/match-season", response_model=TaskTriggerResponse)
async def match_tv_season(
    background_tasks: BackgroundTasks,
    payload: Optional[SeasonMatchRequest] = Body(default=None),
    title: Optional[str] = Query(default=None, min_length=1),
    season: Optional[int] = Query(default=None, ge=1),
) -> TaskTriggerResponse:
    """触发特定剧集的特定季全自动补全字幕"""
    try:
        request = payload or SeasonMatchRequest(title=title or "", season=season or 0)
    except Exception as exc:
        raise_for_service_error(exc)
    background_tasks.add_task(MediaService.run_season_match_process, request.title, request.season)
    return _build_trigger_response(
        message=f"Matching process for '{request.title}' Season {request.season} started",
        task_kind="season_match",
        target=f"{request.title}:S{request.season:02d}",
    )


@router.post("/match", response_model=TaskTriggerResponse)
async def trigger_match(
    background_tasks: BackgroundTasks,
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
) -> TaskTriggerResponse:
    """手动触发媒体库与字幕的自动化匹配"""
    background_tasks.add_task(MediaService.run_media_scan_and_match, path_type)
    return _build_trigger_response(
        message=f"Media scan and match task ({path_type or 'all'}) started",
        task_kind="media_scan",
        target=path_type or "all",
    )


@router.get("/metadata/{file_id}", response_model=MediaMetadataResponse)
async def get_file_metadata(file_id: int, session: Session = Depends(get_session)) -> MediaMetadataResponse:
    """获取媒体文件的元数据（NFO、海报、TXT）。"""
    try:
        return MediaMetadataResponse.model_validate(MetadataService.get_file_metadata(session, file_id))
    except Exception as exc:
        raise_for_service_error(exc)


@router.get("/poster")
async def get_poster(
    path: str = Query(..., description="URL-encoded relative poster path"), session: Session = Depends(get_session)
):
    """服务海报图片。"""
    try:
        poster_path, media_type = MetadataService.resolve_poster(session, path)
    except Exception as exc:
        raise_for_service_error(exc)
    return FileResponse(poster_path, media_type=media_type)
