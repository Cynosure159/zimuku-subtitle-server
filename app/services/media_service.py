import asyncio
import logging
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Set, Tuple

from sqlmodel import Session, select

from ..core.archive import ArchiveManager
from ..core.config import get_storage_path
from ..core.scraper import ZimukuAgent
from ..db.models import MediaPath, ScannedFile
from ..db.session import session_scope
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


@dataclass
class FileMatchContext:
    file_path: str
    filename: str
    extracted_title: str
    media_type: str
    season: Optional[int]
    episode: Optional[int]


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
        await MediaService._run_auto_match_internal(file_id)

    @staticmethod
    def _load_file_match_context(file_id: int) -> Optional[FileMatchContext]:
        with session_scope() as session:
            file_record = session.get(ScannedFile, file_id)
            if not file_record or not file_record.extracted_title:
                return None

            return FileMatchContext(
                file_path=file_record.file_path,
                filename=file_record.filename,
                extracted_title=file_record.extracted_title,
                media_type=file_record.type,
                season=file_record.season,
                episode=file_record.episode,
            )

    @staticmethod
    def _mark_file_has_subtitle(file_id: int):
        with session_scope() as session:
            file_record = session.get(ScannedFile, file_id)
            if not file_record:
                return

            file_record.has_subtitle = True
            session.add(file_record)
            session.commit()

    @staticmethod
    async def _run_auto_match_internal(file_id: int):
        global_task_status.matching_files.add(file_id)
        try:
            file_context = MediaService._load_file_match_context(file_id)
            if not file_context:
                return

            query = re.sub(r"\s*\(\d{4}\)", "", file_context.extracted_title).strip()
            season = file_context.season if file_context.media_type == "tv" else None
            episode = file_context.episode if file_context.media_type == "tv" else None

            logger.info(f"开始自动匹配: {file_context.filename}")
            agent = ZimukuAgent()
            try:
                results = await agent.search(query, season=season, episode=episode)
                if not results:
                    return

                max_tries = min(5, len(results))
                match_success = False

                for i in range(max_tries):
                    best_match = results[i]
                    dld_links = await agent.get_download_page_links(best_match.link)
                    if not dld_links:
                        continue

                    filename, content = await agent.download_file(dld_links, best_match.link)
                    if not content:
                        continue

                    tmp_dir = Path(get_storage_path()) / "tmp" / f"auto_{file_id}_{i}"
                    tmp_dir.mkdir(parents=True, exist_ok=True)
                    archive_path = tmp_dir / filename
                    with open(archive_path, "wb") as f:
                        f.write(content)

                    am = ArchiveManager()
                    extracted_files = []
                    subtitle_extensions = [".srt", ".ass", ".ssa", ".vtt", ".sub"]

                    if archive_path.suffix.lower() in [".zip", ".7z", ".rar"]:
                        extract_to = tmp_dir / "extracted"
                        extract_to.mkdir(exist_ok=True)
                        if am.extract(str(archive_path), str(extract_to)):
                            for root, _, files in os.walk(extract_to):
                                for f in files:
                                    if Path(f).suffix.lower() in subtitle_extensions:
                                        extracted_files.append(Path(root) / f)
                    else:
                        if archive_path.suffix.lower() in subtitle_extensions:
                            extracted_files.append(archive_path)

                    if not extracted_files:
                        shutil.rmtree(tmp_dir, ignore_errors=True)
                        continue

                    def get_sub_score(p: Path) -> int:
                        score = 0
                        name_upper = p.name.upper()
                        if season is not None and episode is not None:
                            se_pattern = f"S{season:02d}E{episode:02d}"
                            if se_pattern in name_upper:
                                score += 500
                            else:
                                other_seasons = re.findall(r"S(\d+)", name_upper)
                                if other_seasons and all(int(s) != season for s in other_seasons):
                                    score -= 1000
                                if f"E{episode:02d}" in name_upper:
                                    score += 50
                        elif episode is not None:
                            if f"E{episode:02d}" in name_upper:
                                score += 500

                        if p.suffix.lower() in [".ass", ".srt"]:
                            score += 50
                        name_lower = p.name.lower()
                        if any(k in name_lower for k in ["简体", "chs", "sc", "gb"]):
                            score += 100
                        if any(k in name_lower for k in ["双语", "bilingual", "eng&chs", "chs&eng"]):
                            score += 80
                        if any(k in name_lower for k in ["繁体", "cht", "tc", "big5"]) and "简" not in name_lower:
                            score -= 30
                        return score

                    extracted_files.sort(key=get_sub_score, reverse=True)
                    target_sub = extracted_files[0]
                    video_path = Path(file_context.file_path)
                    final_sub_path = video_path.parent / (video_path.stem + target_sub.suffix)

                    shutil.move(str(target_sub), str(final_sub_path))
                    MediaService._mark_file_has_subtitle(file_id)
                    logger.info(f"成功为 {file_context.filename} 匹配字幕")

                    shutil.rmtree(tmp_dir, ignore_errors=True)
                    match_success = True
                    break

                if not match_success:
                    logger.error("匹配不到合适字幕")

            finally:
                global_task_status.matching_files.discard(file_id)
                await agent.close()
        except Exception as e:
            logger.error(f"自动匹配异常: {e}", exc_info=True)
        finally:
            global_task_status.matching_files.discard(file_id)

    @staticmethod
    async def run_season_match_process(title: str, season: int):
        from sqlmodel import or_

        # 去除年份，与单文件自动匹配保持一致
        query_title = re.sub(r"\s*\(\d{4}\)", "", title).strip()
        logger.debug(f"开始季匹配: title={title}, query_title={query_title}, season={season}")
        global_task_status.matching_seasons.add((title, season))
        try:
            with session_scope() as session:
                # 同时匹配带年份和不带年份的标题（数据库中可能存的是带年份的）
                logger.debug(f"查询条件: title={query_title}/{title}, season={season}, type=tv, has_subtitle=false")
                statement = select(ScannedFile).where(
                    or_(
                        ScannedFile.extracted_title == query_title,
                        ScannedFile.extracted_title == title,
                    ),
                    ScannedFile.type == "tv",
                    ScannedFile.season == season,
                    ScannedFile.has_subtitle.is_(False),
                )
                files = session.exec(statement).all()
                logger.debug(f"查询到 {len(files)} 个无字幕文件")
                if not files:
                    logger.debug(f"未找到匹配的文件: query_title={query_title}, season={season}")
                    return

                file_ids = [file_record.id for file_record in files if file_record.id is not None]

            for file_id in file_ids:
                logger.debug(f"处理文件ID: {file_id}")
                await MediaService.run_auto_match_process(file_id)
                await asyncio.sleep(2)
            logger.debug(f"季匹配完成: query_title={query_title}, season={season}")
        except Exception as e:
            logger.debug(f"季匹配异常: query_title={query_title}, season={season}, error={e}")
            raise
        finally:
            global_task_status.matching_seasons.discard((title, season))
