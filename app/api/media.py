import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..db.models import MediaPath
from ..db.session import get_session

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)


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


async def run_media_scan_and_match(session_data: Session):
    """执行后台媒体扫描与匹配逻辑"""
    # 1. 获取所有启用的路径
    statement = select(MediaPath).where(MediaPath.enabled)
    paths = session_data.exec(statement).all()

    for mp in paths:
        logger.info(f"正在扫描路径: {mp.path} ({mp.type})")
        # 这里的具体扫描逻辑将在后续完善
        # TODO: 实现视频文件扫描、指纹提取及字幕搜索任务创建
        mp.last_scanned_at = datetime.now()
        session_data.add(mp)

    session_data.commit()


@router.post("/match")
async def trigger_match(background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """手动触发媒体库与字幕的自动化匹配"""
    background_tasks.add_task(run_media_scan_and_match, session)
    return {"status": "ok", "message": "Media scan and match task started in background"}
