import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

from sqlmodel import Session, select

from ..core.utils import check_has_subtitle, parse_media_filename
from ..db.models import MediaPath, ScannedFile

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".ts", ".rmvb"}


@dataclass
class DiscoveredMediaFile:
    path_id: int
    media_type: str
    file_path: str
    filename: str
    extracted_title: str
    year: Optional[str]
    season: Optional[int]
    episode: Optional[int]
    has_subtitle: bool
    series_root_path: Optional[str]


class MediaScanPipeline:
    def __init__(self, session: Session, path_type: Optional[str] = None):
        self.session = session
        self.path_type = path_type

    def run(self) -> None:
        self.cleanup_orphan_records()
        self.cleanup_missing_files()

        media_paths = self.load_enabled_paths()
        if not media_paths:
            return

        existing_records = self.load_existing_records(media_paths)
        discovered_files: List[DiscoveredMediaFile] = []

        for media_path in media_paths:
            discovered_files.extend(self.discover_path(media_path))
            media_path.last_scanned_at = datetime.now()
            self.session.add(media_path)

        self.reconcile_records(discovered_files, existing_records)
        self.session.commit()

    def cleanup_orphan_records(self) -> None:
        path_ids = [path_id for path_id in self.session.exec(select(MediaPath.id)).all() if path_id is not None]
        if path_ids:
            statement = select(ScannedFile).where(ScannedFile.path_id.not_in(path_ids))
        else:
            statement = select(ScannedFile)
        orphan_files = self.session.exec(statement).all()

        for orphan_file in orphan_files:
            self.session.delete(orphan_file)

        if orphan_files:
            logger.info(f"清理了 {len(orphan_files)} 条孤儿文件记录")
            self.session.commit()

    def cleanup_missing_files(self) -> None:
        statement = select(ScannedFile)
        if self.path_type:
            statement = statement.where(ScannedFile.type == self.path_type)

        removed_files = []
        for scanned_file in self.session.exec(statement).all():
            if not Path(scanned_file.file_path).exists():
                self.session.delete(scanned_file)
                removed_files.append(scanned_file)

        if removed_files:
            logger.info(f"清理了 {len(removed_files)} 条物理已不存在的记录")
            self.session.commit()

    def load_enabled_paths(self) -> List[MediaPath]:
        statement = select(MediaPath).where(MediaPath.enabled)
        if self.path_type:
            statement = statement.where(MediaPath.type == self.path_type)
        return self.session.exec(statement).all()

    def load_existing_records(self, media_paths: Sequence[MediaPath]) -> Dict[str, ScannedFile]:
        path_ids = [media_path.id for media_path in media_paths if media_path.id is not None]
        if not path_ids:
            return {}

        statement = select(ScannedFile).where(ScannedFile.path_id.in_(path_ids))
        return {record.file_path: record for record in self.session.exec(statement).all()}

    def discover_path(self, media_path: MediaPath) -> List[DiscoveredMediaFile]:
        scan_dir = Path(media_path.path)
        if not scan_dir.exists() or not scan_dir.is_dir():
            logger.debug(f"路径不存在或不是目录: {media_path.path}")
            return []

        logger.info(f"扫描路径: {media_path.path}")
        logger.debug(f"开始扫描路径: {media_path.path}")

        discovered_files: List[DiscoveredMediaFile] = []
        try:
            for root_dir in self.iter_scan_roots(scan_dir):
                extracted_title = root_dir.name
                series_root_path = str(root_dir.absolute()) if media_path.type == "tv" else None
                for file_path in self.iter_video_files(root_dir, media_path.type):
                    discovered_files.append(
                        self.build_discovered_file(
                            media_path=media_path,
                            file_path=file_path,
                            extracted_title=extracted_title,
                            series_root_path=series_root_path,
                        )
                    )
        except Exception as exc:
            logger.error(f"扫描 {media_path.path} 出错: {exc}")
        return discovered_files

    def iter_scan_roots(self, scan_dir: Path) -> Iterable[Path]:
        for child in scan_dir.iterdir():
            logger.debug(f"处理子目录: {child}")
            if child.is_dir():
                yield child

    def iter_video_files(self, root_dir: Path, media_type: str) -> Iterable[Path]:
        iterator = root_dir.rglob("*") if media_type == "tv" else root_dir.iterdir()
        for file_path in iterator:
            if file_path.is_file() and file_path.suffix.lower() in VIDEO_EXTENSIONS:
                yield file_path

    def build_discovered_file(
        self,
        media_path: MediaPath,
        file_path: Path,
        extracted_title: str,
        series_root_path: Optional[str],
    ) -> DiscoveredMediaFile:
        filename = file_path.name
        parsed = parse_media_filename(filename)
        return DiscoveredMediaFile(
            path_id=media_path.id or 0,
            media_type=media_path.type,
            file_path=str(file_path.absolute()),
            filename=filename,
            extracted_title=extracted_title,
            year=parsed["year"],
            season=parsed["season"],
            episode=parsed["episode"],
            has_subtitle=check_has_subtitle(file_path),
            series_root_path=series_root_path,
        )

    def reconcile_records(
        self,
        discovered_files: Sequence[DiscoveredMediaFile],
        existing_records: Dict[str, ScannedFile],
    ) -> None:
        for discovered in discovered_files:
            existing_file = existing_records.get(discovered.file_path)
            if existing_file is None:
                existing_file = ScannedFile(
                    path_id=discovered.path_id,
                    type=discovered.media_type,
                    file_path=discovered.file_path,
                    filename=discovered.filename,
                    extracted_title=discovered.extracted_title,
                    year=discovered.year,
                    season=discovered.season,
                    episode=discovered.episode,
                    has_subtitle=discovered.has_subtitle,
                    series_root_path=discovered.series_root_path,
                )
            else:
                existing_file.path_id = discovered.path_id
                existing_file.type = discovered.media_type
                existing_file.filename = discovered.filename
                existing_file.extracted_title = discovered.extracted_title
                existing_file.year = discovered.year
                existing_file.season = discovered.season
                existing_file.episode = discovered.episode
                existing_file.has_subtitle = discovered.has_subtitle
                existing_file.series_root_path = discovered.series_root_path

            self.session.add(existing_file)
