import logging
import os
import shutil

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from ..core.config import ConfigManager
from ..db.models import SearchCache, SubtitleTask
from ..db.session import get_session

router = APIRouter(prefix="/system", tags=["System"])
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_system_stats(session: Session = Depends(get_session)):
    """获取系统统计信息"""
    # 1. 任务统计
    total_tasks = session.exec(select(func.count()).select_from(SubtitleTask)).one()
    completed_tasks = session.exec(
        select(func.count()).select_from(SubtitleTask).where(SubtitleTask.status == "completed")
    ).one()
    failed_tasks = session.exec(
        select(func.count()).select_from(SubtitleTask).where(SubtitleTask.status == "failed")
    ).one()

    # 2. 缓存统计
    total_cache = session.exec(select(func.count()).select_from(SearchCache)).one()

    # 3. 存储统计
    storage_path = ConfigManager.get("storage_path", "storage/downloads")
    storage_info = {"path": storage_path, "total_size_mb": 0, "free_space_gb": 0}

    if os.path.exists(storage_path):
        # 计算已用空间
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(storage_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                total_size += os.path.getsize(fp)
        storage_info["total_size_mb"] = round(total_size / (1024 * 1024), 2)

        # 磁盘可用空间
        total, used, free = shutil.disk_usage(storage_path)
        storage_info["free_space_gb"] = round(free / (1024 * 1024 * 1024), 2)

    return {
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "failed": failed_tasks,
            "pending": total_tasks - completed_tasks - failed_tasks,
        },
        "cache": {"total_entries": total_cache},
        "storage": storage_info,
    }


@router.get("/logs")
async def get_recent_logs(lines: int = 100):
    """获取最近的日志记录 (简单实现)"""
    # 注意：这里假设日志输出到了文件，或者从内存中读取
    # 为了演示，我们只返回一个占位符，或者尝试读取 app.log (如果存在)
    log_file = "app.log"
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                content = f.readlines()
                return content[-lines:]
        except Exception as e:
            return [f"Error reading log file: {e}"]

    return ["Log file not found. Ensure logging is configured to write to app.log"]
