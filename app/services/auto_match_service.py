import asyncio
import logging
import re
import shutil
from contextlib import AbstractContextManager
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, List, Optional

from sqlmodel import Session, or_, select

from ..core.archive import ArchiveManager
from ..core.config import get_storage_path
from ..core.scraper import ZimukuAgent
from ..db.models import ScannedFile

logger = logging.getLogger(__name__)

SUBTITLE_EXTENSIONS = (".srt", ".ass", ".ssa", ".vtt", ".sub")


@dataclass
class FileMatchContext:
    file_path: str
    filename: str
    extracted_title: str
    media_type: str
    season: Optional[int]
    episode: Optional[int]


@dataclass
class SubtitleCandidate:
    path: Path
    score: int


class SubtitleCandidateScorer:
    @staticmethod
    def score(path: Path, season: Optional[int] = None, episode: Optional[int] = None) -> int:
        score = 0
        name_upper = path.name.upper()
        name_lower = path.name.lower()

        if season is not None and episode is not None:
            season_episode_pattern = f"S{season:02d}E{episode:02d}"
            if season_episode_pattern in name_upper:
                score += 500
            else:
                other_seasons = re.findall(r"S(\d+)", name_upper)
                if other_seasons and all(int(value) != season for value in other_seasons):
                    score -= 1000
                if f"E{episode:02d}" in name_upper:
                    score += 50
        elif episode is not None and f"E{episode:02d}" in name_upper:
            score += 500

        if path.suffix.lower() in {".ass", ".srt"}:
            score += 50
        if any(token in name_lower for token in ["简体", "chs", "sc", "gb"]):
            score += 100
        if any(token in name_lower for token in ["双语", "bilingual", "eng&chs", "chs&eng"]):
            score += 80
        if any(token in name_lower for token in ["繁体", "cht", "tc", "big5"]) and "简" not in name_lower:
            score -= 30
        return score


class AutoMatchWorkflow:
    def __init__(
        self,
        session_factory: Callable[[], AbstractContextManager[Session]],
        agent_factory: Optional[Callable[[], ZimukuAgent]] = None,
    ):
        self._session_factory = session_factory
        self._agent_factory = agent_factory or ZimukuAgent

    def load_file_context(self, file_id: int) -> Optional[FileMatchContext]:
        with self._session_factory() as session:
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

    def mark_file_has_subtitle(self, file_id: int):
        with self._session_factory() as session:
            file_record = session.get(ScannedFile, file_id)
            if not file_record:
                return

            file_record.has_subtitle = True
            session.add(file_record)
            session.commit()

    async def run_for_file(self, file_id: int) -> bool:
        file_context = self.load_file_context(file_id)
        if not file_context:
            return False

        query = re.sub(r"\s*\(\d{4}\)", "", file_context.extracted_title).strip()
        season = file_context.season if file_context.media_type == "tv" else None
        episode = file_context.episode if file_context.media_type == "tv" else None

        logger.info("开始自动匹配: %s", file_context.filename)
        agent = self._agent_factory()
        try:
            results = await agent.search(query, season=season, episode=episode)
            if not results:
                return False

            for attempt_index, best_match in enumerate(results[:5]):
                if await self._try_candidate(
                    agent=agent,
                    file_id=file_id,
                    file_context=file_context,
                    match_link=best_match.link,
                    attempt_index=attempt_index,
                ):
                    logger.info("成功为 %s 匹配字幕", file_context.filename)
                    return True

            logger.error("匹配不到合适字幕")
            return False
        finally:
            await agent.close()

    async def _try_candidate(
        self,
        agent: ZimukuAgent,
        file_id: int,
        file_context: FileMatchContext,
        match_link: str,
        attempt_index: int,
    ) -> bool:
        download_links = await agent.get_download_page_links(match_link)
        if not download_links:
            return False

        filename, content = await agent.download_file(download_links, match_link)
        if not filename or not content:
            return False

        tmp_dir = self._build_tmp_dir(file_id, attempt_index)
        try:
            archive_path = tmp_dir / filename
            with open(archive_path, "wb") as file_obj:
                file_obj.write(content)

            candidates = self._collect_candidates(
                downloaded_path=archive_path,
                season=file_context.season if file_context.media_type == "tv" else None,
                episode=file_context.episode if file_context.media_type == "tv" else None,
            )
            if not candidates:
                return False

            target_subtitle = candidates[0].path
            video_path = Path(file_context.file_path)
            final_subtitle_path = video_path.parent / f"{video_path.stem}{target_subtitle.suffix}"
            shutil.move(str(target_subtitle), str(final_subtitle_path))
            self.mark_file_has_subtitle(file_id)
            return True
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    @staticmethod
    def _build_tmp_dir(file_id: int, attempt_index: int) -> Path:
        tmp_dir = Path(get_storage_path()) / "tmp" / f"auto_{file_id}_{attempt_index}"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        return tmp_dir

    @classmethod
    def _collect_candidates(
        cls,
        downloaded_path: Path,
        season: Optional[int],
        episode: Optional[int],
    ) -> List[SubtitleCandidate]:
        subtitle_files: List[Path] = []

        if ArchiveManager.is_archive(downloaded_path.name):
            extract_to = downloaded_path.parent / "extracted"
            extract_to.mkdir(exist_ok=True)
            extracted_files = ArchiveManager.extract(str(downloaded_path), str(extract_to))
            subtitle_files.extend(
                Path(path) for path in extracted_files if Path(path).suffix.lower() in SUBTITLE_EXTENSIONS
            )
        elif downloaded_path.suffix.lower() in SUBTITLE_EXTENSIONS:
            subtitle_files.append(downloaded_path)

        candidates = [
            SubtitleCandidate(
                path=path,
                score=SubtitleCandidateScorer.score(path, season=season, episode=episode),
            )
            for path in subtitle_files
        ]
        return sorted(candidates, key=lambda candidate: candidate.score, reverse=True)


class SeasonMatchWorkflow:
    def __init__(
        self,
        session_factory: Callable[[], AbstractContextManager[Session]],
        auto_match_runner: Callable[[int], Awaitable[bool]],
        sleep_func: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ):
        self._session_factory = session_factory
        self._auto_match_runner = auto_match_runner
        self._sleep = sleep_func

    def load_pending_file_ids(self, title: str, season: int) -> List[int]:
        query_title = re.sub(r"\s*\(\d{4}\)", "", title).strip()

        with self._session_factory() as session:
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
            return [file_record.id for file_record in files if file_record.id is not None]

    async def run_for_season(self, title: str, season: int):
        file_ids = self.load_pending_file_ids(title, season)
        if not file_ids:
            logger.debug("未找到匹配的文件: title=%s, season=%s", title, season)
            return

        logger.debug("季匹配开始: title=%s, season=%s, files=%s", title, season, len(file_ids))
        for file_id in file_ids:
            await self._auto_match_runner(file_id)
            await self._sleep(2)
        logger.debug("季匹配完成: title=%s, season=%s", title, season)
