import logging
import mimetypes
from pathlib import Path
from typing import List, Optional
from urllib.parse import unquote

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlmodel import Session

from ..db.models import MediaPath, ScannedFile
from ..db.session import get_session
from ..services.media_service import MediaService, global_task_status
from ..services.metadata_service import MetadataService

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)


def _resolve_media_asset_path(decoded_path: str, media_roots: list[Path]) -> Path:
    candidate = Path(decoded_path)
    if candidate.is_absolute():
        raise HTTPException(status_code=404, detail="Poster not found")

    normalized_parts = []
    for part in candidate.parts:
        if part in {"", "."}:
            continue
        if part == "..":
            raise HTTPException(status_code=404, detail="Poster not found")
        normalized_parts.append(part)

    if not normalized_parts:
        raise HTTPException(status_code=404, detail="Poster not found")

    normalized_path = Path(*normalized_parts)
    for root in media_roots:
        resolved_root = root.resolve()
        resolved_path = (resolved_root / normalized_path).resolve(strict=False)

        try:
            resolved_path.relative_to(resolved_root)
        except ValueError:
            continue

        if resolved_path.is_file():
            return resolved_path

    raise HTTPException(status_code=404, detail="Poster not found")


def _guess_image_media_type(file_path: Path) -> str:
    media_type, _ = mimetypes.guess_type(file_path.name)
    if media_type and media_type.startswith("image/"):
        return media_type
    return "image/jpeg"


@router.get("/task-status")
async def get_task_status():
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
    background_tasks.add_task(MediaService.run_media_scan_and_match, path_type)
    return {"status": "ok", "message": f"Media scan and match task ({path_type or 'all'}) started"}


@router.get("/metadata/{file_id}")
async def get_file_metadata(file_id: int, session: Session = Depends(get_session)):
    """
    获取媒体文件的元数据（NFO、海报、TXT）。

    从NFO文件提取：title, year, plot, rating, genres, director
    从文件夹检测：poster image
    从TXT文件回退：key:value metadata

    对于 TV 剧集，优先使用剧集根目录下的 tvshow.nfo 和海报。
    """
    # Look up file in database
    file_record = session.get(ScannedFile, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Get folder path
    file_path = Path(file_record.file_path)
    folder = file_path.parent

    # Get media root path
    media_path = session.get(MediaPath, file_record.path_id)
    media_root = Path(media_path.path) if media_path else None

    # Determine show/movie root folder
    # For TV: /media_root/Show Title/Season X/file.mp4 -> use /media_root/Show Title
    # For Movie: /media_root/Movie Title/file.mp4 -> use /media_root/Movie Title
    is_tv = file_record.type == "tv"
    if is_tv and media_root and file_record.extracted_title:
        # TV show: find the show root folder
        show_root = media_root / file_record.extracted_title
    else:
        # Movie: use parent folder
        show_root = folder

    # Find and parse NFO (prioritize show root for TV)
    nfo_data = None
    nfo_path = None

    if is_tv:
        # For TV shows, first try show root (tvshow.nfo)
        tvshow_nfo = show_root / "tvshow.nfo"
        if tvshow_nfo.exists():
            nfo_path = tvshow_nfo
            nfo_data = MetadataService.parse_nfo(nfo_path)

    # Fallback to file's parent folder if not found
    if not nfo_path:
        nfo_path = MetadataService.find_nfo_file(folder, file_record.filename)
        if nfo_path:
            nfo_data = MetadataService.parse_nfo(nfo_path)

    # Find poster and fanart (prioritize show root for TV)
    poster_path = None
    fanart_path = None

    if is_tv and show_root.exists():
        poster_path = MetadataService.find_poster(show_root, file_record.filename)
        fanart_path = MetadataService.find_fanart(show_root, file_record.filename)

    if not poster_path:
        poster_path = MetadataService.find_poster(folder, file_record.filename)
    if not fanart_path:
        fanart_path = MetadataService.find_fanart(folder, file_record.filename)

    # Find and parse TXT fallback
    txt_info = None
    txt_path = MetadataService.find_txt_file(folder, file_record.filename)
    if txt_path:
        txt_info = MetadataService.parse_txt_info(txt_path)

    # Return relative paths for frontend to construct URL
    poster_relative = None
    fanart_relative = None

    if poster_path:
        try:
            if media_root:
                poster_relative = str(poster_path.relative_to(media_root))
        except ValueError:
            poster_relative = str(poster_path.name)

    if fanart_path:
        try:
            if media_root:
                fanart_relative = str(fanart_path.relative_to(media_root))
        except ValueError:
            fanart_relative = str(fanart_path.name)

    return {
        "file_id": file_id,
        "filename": file_record.filename,
        "nfo_data": nfo_data,
        "poster_path": poster_relative,
        "fanart_path": fanart_relative,
        "txt_info": txt_info,
    }


@router.get("/poster")
async def get_poster(
    path: str = Query(..., description="URL-encoded relative poster path"), session: Session = Depends(get_session)
):
    """
    服务海报图片。

    Args:
        path: URL-encoded relative path from media root (e.g., "Movies/Avatar/folder.jpg")
    """
    decoded_path = unquote(path)
    media_roots = [Path(mp.path) for mp in MediaService.list_paths(session)]
    poster_path = _resolve_media_asset_path(decoded_path, media_roots)
    return FileResponse(poster_path, media_type=_guess_image_media_type(poster_path))
