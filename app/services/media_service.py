import logging
from typing import List, Optional, Set, Tuple

from sqlmodel import Session, select

from ..db.models import MediaPath, ScannedFile
from ..db.session import session_scope
from .auto_match_service import AutoMatchWorkflow, SeasonMatchWorkflow
from .media_scan_pipeline import MediaScanPipeline

logger = logging.getLogger(__name__)


class MediaTaskStatus:
    def __init__(self):
        self.is_scanning = False
        self.matching_files: Set[int] = set()
        self.matching_seasons: Set[Tuple[str, int]] = set()

    def to_dict(self):
        return {
            "is_scanning": self.is_scanning,
            "matching_files": list(self.matching_files),
            "matching_seasons": [{"title": t, "season": s} for t, s in self.matching_seasons],
        }


global_task_status = MediaTaskStatus()


class MediaService:
    @staticmethod
    def list_paths(session: Session) -> List[MediaPath]:
        return session.exec(select(MediaPath)).all()

    @staticmethod
    def add_path(session: Session, path: str, path_type: str) -> MediaPath:
        existing = session.exec(select(MediaPath).where(MediaPath.path == path)).first()
        if existing:
            raise ValueError("Path already exists")

        new_path = MediaPath(path=path, type=path_type)
        session.add(new_path)
        session.commit()
        session.refresh(new_path)
        return new_path

    @staticmethod
    def delete_path(session: Session, path_id: int) -> bool:
        path = session.get(MediaPath, path_id)
        if not path:
            return False

        # 删除相关扫描记录
        statement = select(ScannedFile).where(ScannedFile.path_id == path_id)
        file_records = session.exec(statement).all()
        for file_record in file_records:
            session.delete(file_record)
        session.commit()

        # 删除路径
        db_path = session.get(MediaPath, path_id)
        if db_path:
            session.delete(db_path)
            session.commit()
            return True
        return False

    @staticmethod
    def update_path(
        session: Session, path_id: int, enabled: Optional[bool] = None, path_type: Optional[str] = None
    ) -> Optional[MediaPath]:
        db_path = session.get(MediaPath, path_id)
        if not db_path:
            return None

        if enabled is not None:
            db_path.enabled = enabled
        if path_type is not None:
            db_path.type = path_type

        session.add(db_path)
        session.commit()
        session.refresh(db_path)
        return db_path

    @staticmethod
    def list_files(session: Session, path_type: Optional[str] = None) -> List[ScannedFile]:
        statement = select(ScannedFile)
        if path_type:
            statement = statement.where(ScannedFile.type == path_type)
        statement = statement.order_by(ScannedFile.created_at.desc())
        return session.exec(statement).all()

    @staticmethod
    async def run_media_scan_and_match(path_type: Optional[str] = None):
        """执行后台媒体扫描与匹配逻辑"""
        global_task_status.is_scanning = True
        try:
            with session_scope() as session:
                MediaScanPipeline(session=session, path_type=path_type).run()
        finally:
            global_task_status.is_scanning = False

    @staticmethod
    async def run_auto_match_process(file_id: int):
        return await MediaService._run_auto_match_internal(file_id)

    @staticmethod
    async def _run_auto_match_internal(file_id: int):
        global_task_status.matching_files.add(file_id)
        try:
            service = AutoMatchWorkflow(session_factory=session_scope)
            return await service.run_for_file(file_id)
        except Exception as e:
            logger.error(f"自动匹配异常: {e}", exc_info=True)
            return False
        finally:
            global_task_status.matching_files.discard(file_id)

    @staticmethod
    async def run_season_match_process(title: str, season: int):
        global_task_status.matching_seasons.add((title, season))
        try:
            service = SeasonMatchWorkflow(
                session_factory=session_scope,
                auto_match_runner=MediaService.run_auto_match_process,
            )
            await service.run_for_season(title, season)
        except Exception as e:
            logger.debug(f"季匹配异常: title={title}, season={season}, error={e}")
            raise
        finally:
            global_task_status.matching_seasons.discard((title, season))
