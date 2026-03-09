import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..db.models import MediaPath, ScannedFile
from ..db.session import get_session

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)


def parse_media_filename(filename: str) -> dict:
    """解析文件名：提取标题、年份、季、集"""
    name = os.path.splitext(filename)[0]
    result = {
        "extracted_title": name,
        "year": None,
        "season": None,
        "episode": None
    }
    
    # 提取季和集 (e.g. S01E02, s1e2, S1.E2)
    se_match = re.search(r"(?i)s(\d+)[._\s-]*e(\d+)", name)
    if se_match:
        result["season"] = int(se_match.group(1))
        result["episode"] = int(se_match.group(2))
        name = name[: se_match.start()].strip()
    
    # 查找年份 19xx 或 20xx
    match = re.search(r"\b(19\d{2}|20\d{2})\b", name)
    if match:
        result["year"] = match.group(1)
        name = name[: match.start()].strip()
        
    # 将 ._ 替换为空格
    name = re.sub(r"[\._]", " ", name)
    
    # 移除常见的干扰词
    name = re.sub(r"(?i)(1080p|720p|2160p|4k|bluray|web-dl|x264|x265|hevc|aac).*$", "", name).strip()
    result["extracted_title"] = name
    return result

def check_has_subtitle(file_path: Path) -> bool:
    """检查是否存在同名字幕文件"""
    base_name = file_path.stem
    dir_path = file_path.parent
    subtitle_exts = {".srt", ".ass", ".ssa", ".vtt", ".sub"}
    
    try:
        for f in dir_path.iterdir():
            if f.is_file() and f.suffix.lower() in subtitle_exts:
                if f.stem.startswith(base_name):
                    return True
    except Exception:
        pass
    return False

@router.get("/paths", response_model=List[MediaPath])
async def list_media_paths(session: Session = Depends(get_session)):
    """获取所有媒体库扫描路径"""
    statement = select(MediaPath)
    results = session.exec(statement).all()
    return results


@router.post("/paths", response_model=MediaPath)
async def add_media_path(
    path: str,
    path_type: str = Query(default="movie", pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """添加媒体库扫描路径"""
    # 检查是否已存在
    existing = session.exec(select(MediaPath).where(MediaPath.path == path)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Path already exists")

    new_path = MediaPath(path=path, type=path_type)
    session.add(new_path)
    session.commit()
    session.refresh(new_path)
    return new_path


@router.delete("/paths/{path_id}")
async def delete_media_path(path_id: int, session: Session = Depends(get_session)):
    """删除媒体库扫描路径"""
    path = session.get(MediaPath, path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    # 删除相关的扫描文件记录
    for file_record in session.exec(select(ScannedFile).where(ScannedFile.path_id == path_id)).all():
        session.delete(file_record)

    session.delete(path)
    session.commit()
    return {"status": "ok", "message": f"Path {path_id} deleted"}


@router.patch("/paths/{path_id}", response_model=MediaPath)
async def update_media_path(
    path_id: int,
    enabled: Optional[bool] = None,
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """更新媒体库扫描路径配置"""
    db_path = session.get(MediaPath, path_id)
    if not db_path:
        raise HTTPException(status_code=404, detail="Path not found")

    if enabled is not None:
        db_path.enabled = enabled
    if path_type is not None:
        db_path.type = path_type

    session.add(db_path)
    session.commit()
    session.refresh(db_path)
    return db_path


@router.get("/files", response_model=List[ScannedFile])
async def list_scanned_files(
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"), session: Session = Depends(get_session)
):
    """获取已扫描的媒体文件列表"""
    statement = select(ScannedFile)
    if path_type:
        statement = statement.where(ScannedFile.type == path_type)
    statement = statement.order_by(ScannedFile.created_at.desc())
    results = session.exec(statement).all()
    return results


async def run_media_scan_and_match(session_data: Session):
    """执行后台媒体扫描与匹配逻辑"""
    # 1. 获取所有启用的路径
    statement = select(MediaPath).where(MediaPath.enabled)
    paths = session_data.exec(statement).all()

    video_extensions = {".mp4", ".mkv", ".avi", ".ts", ".rmvb"}

    for mp in paths:
        logger.info(f"正在扫描路径: {mp.path} ({mp.type})")
        scan_dir = Path(mp.path)

        if not scan_dir.exists() or not scan_dir.is_dir():
            logger.warning(f"路径不存在或不是目录: {mp.path}")
            continue

        video_count = 0
        try:
            for file_path in scan_dir.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in video_extensions:
                    str_path = str(file_path.absolute())
                    logger.debug(f"找到视频文件: {str_path}")

                    filename = file_path.name
                    parsed = parse_media_filename(filename)
                    has_sub = check_has_subtitle(file_path)

                    # 检查数据库是否已有记录
                    existing_file = session_data.exec(
                        select(ScannedFile).where(ScannedFile.file_path == str_path)
                    ).first()

                    if not existing_file:
                        new_file = ScannedFile(
                            path_id=mp.id,
                            type=mp.type,
                            file_path=str_path,
                            filename=filename,
                            extracted_title=parsed["extracted_title"],
                            year=parsed["year"],
                            season=parsed["season"],
                            episode=parsed["episode"],
                            has_subtitle=has_sub,
                        )
                        session_data.add(new_file)
                    else:
                        existing_file.filename = filename
                        existing_file.extracted_title = parsed["extracted_title"]
                        existing_file.year = parsed["year"]
                        existing_file.season = parsed["season"]
                        existing_file.episode = parsed["episode"]
                        existing_file.has_subtitle = has_sub
                        session_data.add(existing_file)

                    video_count += 1
        except Exception as e:
            logger.error(f"扫描路径 {mp.path} 时发生错误: {e}")

        logger.info(f"路径 {mp.path} 扫描完成，共找到 {video_count} 个视频文件。")
        mp.last_scanned_at = datetime.now()
        session_data.add(mp)

    session_data.commit()


@router.post("/match")
async def trigger_match(background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """手动触发媒体库与字幕的自动化匹配"""
    background_tasks.add_task(run_media_scan_and_match, session)
    return {"status": "ok", "message": "Media scan and match task started in background"}
