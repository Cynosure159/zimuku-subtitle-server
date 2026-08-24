import json
import logging
from typing import Any, List, Optional, Set, Tuple

from sqlmodel import Session, col, or_, select

from ..db.models import MediaPath, ScannedFile
from ..db.session import session_scope
from .auto_match_workflow import AutoMatchWorkflow, SeasonMatchWorkflow
from .errors import ConflictError
from .media_scan_pipeline import MediaScanPipeline

logger = logging.getLogger(__name__)

MEDIA_LEVEL_TYPES = {"movie": "movie", "show": "tv", "season": "tv", "episode": "tv"}


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
        return list(session.exec(select(MediaPath)).all())

    @staticmethod
    def _build_files_statement(path_type: Optional[str] = None):
        statement = select(ScannedFile)
        if path_type:
            statement = statement.where(ScannedFile.type == path_type)
        return statement.order_by(col(ScannedFile.created_at).desc())

    @staticmethod
    def add_path(session: Session, path: str, path_type: str) -> MediaPath:
        existing = session.exec(select(MediaPath).where(MediaPath.path == path)).first()
        if existing:
            raise ConflictError("Path already exists")

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

        statement = select(ScannedFile).where(ScannedFile.path_id == path_id)
        file_records = session.exec(statement).all()
        for file_record in file_records:
            session.delete(file_record)

        session.delete(path)
        session.commit()
        return True

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
        statement = MediaService._build_files_statement(path_type)
        return list(session.exec(statement).all())

    @staticmethod
    def list_files_paginated(
        session: Session,
        path_type: Optional[str] = None,
        offset: int = 0,
        limit: Optional[int] = None,
    ) -> List[ScannedFile]:
        statement = MediaService._build_files_statement(path_type).offset(offset)
        if limit is not None:
            statement = statement.limit(limit)
        return list(session.exec(statement).all())

    @staticmethod
    def list_media_paginated(
        session: Session,
        level: str,
        media_type: Optional[str] = None,
        query: Optional[str] = None,
        title: Optional[str] = None,
        season: Optional[int] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[List[dict[str, Any]], int]:
        """按逻辑媒体层级聚合扫描文件，而非直接暴露文件记录。"""
        expected_type = MEDIA_LEVEL_TYPES[level]
        if media_type and media_type != expected_type:
            raise ValueError(f"level '{level}' 仅支持 media_type '{expected_type}'")

        statement = select(ScannedFile).where(ScannedFile.type == expected_type)
        if title:
            statement = statement.where(ScannedFile.extracted_title == title)
        if season is not None:
            statement = statement.where(ScannedFile.season == season)

        matching_group_keys = None
        if query and query.strip():
            pattern = f"%{query.strip().lower()}%"
            matching_statement = statement.where(
                or_(
                    col(ScannedFile.extracted_title).ilike(pattern),
                    col(ScannedFile.filename).ilike(pattern),
                    col(ScannedFile.year).ilike(pattern),
                    col(ScannedFile.nfo_title).ilike(pattern),
                    col(ScannedFile.nfo_original_title).ilike(pattern),
                    col(ScannedFile.nfo_aliases).ilike(pattern),
                )
            )
            matching_group_keys = set()
            for file_record in session.exec(matching_statement).all():
                summary = MediaService._build_media_summary(level, file_record)
                if summary is not None:
                    matching_group_keys.add(summary[0])

        files = list(session.exec(statement).all())
        grouped: dict[tuple[Any, ...], dict[str, Any]] = {}
        for file_record in files:
            summary = MediaService._build_media_summary(level, file_record)
            if summary is None:
                continue

            group_key, item = summary
            if matching_group_keys is not None and group_key not in matching_group_keys:
                continue
            existing = grouped.get(group_key)
            if existing is None:
                item["path_ids"] = {file_record.path_id}
                item["file_count"] = 1
                item["subtitle_file_count"] = int(file_record.has_subtitle)
                grouped[group_key] = item
                continue

            existing["path_ids"].add(file_record.path_id)
            existing["file_count"] += 1
            existing["subtitle_file_count"] += int(file_record.has_subtitle)

        items = []
        for item in grouped.values():
            item["path_ids"] = sorted(item["path_ids"])
            item["missing_subtitle_file_count"] = item["file_count"] - item["subtitle_file_count"]
            items.append(item)

        items.sort(key=lambda item: (item["title"].casefold(), item["season"] or 0, item["episode"] or 0))
        total = len(items)
        return items[offset : offset + limit], total

    @staticmethod
    def _build_media_summary(level: str, file_record: ScannedFile) -> Optional[tuple[tuple[Any, ...], dict[str, Any]]]:
        title = file_record.extracted_title or file_record.filename
        if level == "movie":
            group_key = ("movie", title, file_record.year)
            media_key = f"movie:{title}:{file_record.year or 'unknown'}"
            return group_key, MediaService._create_media_summary(
                level, media_key, title, file_record, year=file_record.year
            )
        if level == "show":
            group_key = ("show", title)
            return group_key, MediaService._create_media_summary(level, f"show:{title}", title, file_record)
        if file_record.season is None:
            return None
        if level == "season":
            group_key = ("season", title, file_record.season)
            media_key = f"show:{title}:season:{file_record.season}"
            return group_key, MediaService._create_media_summary(
                level, media_key, title, file_record, season=file_record.season
            )
        if file_record.episode is None:
            return None
        group_key = ("episode", title, file_record.season, file_record.episode)
        media_key = f"show:{title}:season:{file_record.season}:episode:{file_record.episode}"
        return group_key, MediaService._create_media_summary(
            level,
            media_key,
            title,
            file_record,
            season=file_record.season,
            episode=file_record.episode,
        )

    @staticmethod
    def _create_media_summary(
        level: str,
        media_key: str,
        title: str,
        file_record: ScannedFile,
        year: Optional[str] = None,
        season: Optional[int] = None,
        episode: Optional[int] = None,
    ) -> dict[str, Any]:
        return {
            "media_key": media_key,
            "level": level,
            "media_type": MEDIA_LEVEL_TYPES[level],
            "title": title,
            "nfo_title": file_record.nfo_title,
            "nfo_original_title": file_record.nfo_original_title,
            "nfo_aliases": MediaService._deserialize_aliases(file_record.nfo_aliases),
            "year": year,
            "season": season,
            "episode": episode,
        }

    @staticmethod
    def _deserialize_aliases(aliases: Optional[str]) -> List[str]:
        if not aliases:
            return []
        try:
            parsed_aliases = json.loads(aliases)
        except json.JSONDecodeError:
            return []
        return parsed_aliases if isinstance(parsed_aliases, list) else []

    @staticmethod
    def get_file(session: Session, file_id: int) -> Optional[ScannedFile]:
        return session.get(ScannedFile, file_id)

    @staticmethod
    async def run_media_scan_and_match(path_type: Optional[str] = None) -> None:
        """刷新媒体库文件记录，不执行字幕搜索、下载或移动。"""
        global_task_status.is_scanning = True
        try:
            with session_scope() as session:
                MediaScanPipeline(session=session, path_type=path_type).run()
        finally:
            global_task_status.is_scanning = False

    @staticmethod
    async def run_auto_match_process(file_id: int) -> bool:
        return await MediaService._run_auto_match_internal(file_id)

    @staticmethod
    async def _run_auto_match_internal(file_id: int) -> bool:
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
    async def run_season_match_process(title: str, season: int) -> None:
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
