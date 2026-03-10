import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session

from ..db.models import MediaPath, ScannedFile
from ..db.session import get_session
from ..services.media_service import MediaService, global_task_status

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)


@router.get("/status")
async def get_media_task_status():
    """获取当前的后台任务状态"""
    return global_task_status.to_dict()


@router.get("/paths", response_model=List[MediaPath])
async def list_media_paths(session: Session = Depends(get_session)):
    """获取所有媒体库扫描路径"""
    return MediaService.list_paths(session)


@router.post("/paths", response_model=MediaPath)
async def add_media_path(
    path: str,
    path_type: str = Query(default="movie", pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """添加媒体库扫描路径"""
    try:
        return MediaService.add_path(session, path, path_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/paths/{path_id}")
async def delete_media_path(path_id: int, session: Session = Depends(get_session)):
    """删除媒体库扫描路径"""
    success = MediaService.delete_path(session, path_id)
    if not success:
        raise HTTPException(status_code=404, detail="Path not found")
    return {"status": "ok", "message": f"Path {path_id} and its associated files deleted"}


@router.patch("/paths/{path_id}", response_model=MediaPath)
async def update_media_path(
    path_id: int,
    enabled: Optional[bool] = None,
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """更新媒体库扫描路径配置"""
    updated = MediaService.update_path(session, path_id, enabled, path_type)
    if not updated:
        raise HTTPException(status_code=404, detail="Path not found")
    return updated


@router.get("/files", response_model=List[ScannedFile])
async def list_scanned_files(
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"), session: Session = Depends(get_session)
):
    """获取已扫描的媒体文件列表"""
    return MediaService.list_files(session, path_type)


@router.post("/files/{file_id}/auto-match")
async def auto_match_single_file(
    file_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)
):
    """针对单个视频文件触发全自动搜索、下载与归档逻辑"""
    file_record = session.get(ScannedFile, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # 提交给 service 处理
    background_tasks.add_task(MediaService.run_auto_match_process, file_id)
    return {"status": "ok", "message": f"Full auto-match process for '{file_record.filename}' started"}


@router.post("/tv/match-season")
async def match_tv_season(title: str, season: int, background_tasks: BackgroundTasks):
    """触发特定剧集的特定季全自动补全字幕"""
    background_tasks.add_task(MediaService.run_season_match_process, title, season)
    return {"status": "ok", "message": f"Matching process for '{title}' Season {season} started"}


@router.post("/match")
async def trigger_match(
    background_tasks: BackgroundTasks,
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """手动触发媒体库与字幕的自动化匹配"""
    background_tasks.add_task(MediaService.run_media_scan_and_match, session, path_type)
    return {"status": "ok", "message": f"Media scan and match task ({path_type or 'all'}) started"}
