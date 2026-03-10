import os
import shutil
from typing import Any, Dict, List

from sqlmodel import Session, func, select

from ..core.config import ConfigManager
from ..db.models import SearchCache, SubtitleTask


class SystemService:
    @staticmethod
    def get_stats(session: Session) -> Dict[str, Any]:
        total_tasks = session.exec(select(func.count()).select_from(SubtitleTask)).one()
        completed_tasks = session.exec(
            select(func.count()).select_from(SubtitleTask).where(SubtitleTask.status == "completed")
        ).one()
        failed_tasks = session.exec(
            select(func.count()).select_from(SubtitleTask).where(SubtitleTask.status == "failed")
        ).one()

        total_cache = session.exec(select(func.count()).select_from(SearchCache)).one()

        storage_path = ConfigManager.get("storage_path", "storage/downloads")
        storage_info = {"path": storage_path, "total_size_mb": 0, "free_space_gb": 0}

        if os.path.exists(storage_path):
            total_size = 0
            for dirpath, _, filenames in os.walk(storage_path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    total_size += os.path.getsize(fp)
            storage_info["total_size_mb"] = round(total_size / (1024 * 1024), 2)

            _, _, free = shutil.disk_usage(storage_path)
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

    @staticmethod
    def get_logs(lines: int = 100) -> List[str]:
        log_file = "app.log"
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8") as f:
                    content = f.readlines()
                    return content[-lines:]
            except Exception as e:
                return [f"Error reading log file: {e}"]
        return ["Log file not found. Ensure logging is configured to write to app.log"]
