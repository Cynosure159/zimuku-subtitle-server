import logging

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..db.session import get_session
from ..services.system_service import SystemService

router = APIRouter(prefix="/system", tags=["System"])
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_system_stats(session: Session = Depends(get_session)):
    """获取系统统计信息"""
    return SystemService.get_stats(session)


@router.get("/logs")
async def get_recent_logs(lines: int = 100):
    """获取最近的日志记录"""
    return SystemService.get_logs(lines)
