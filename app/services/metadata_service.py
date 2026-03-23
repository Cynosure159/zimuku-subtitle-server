import mimetypes
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

from sqlmodel import Session, select

from ..core import metadata as metadata_module
from ..db.models import MediaPath, ScannedFile


class MetadataService:
    """Service layer for metadata extraction, encapsulating Core metadata module"""

    @staticmethod
    def _resolve_media_asset_path(decoded_path: str, media_roots: list[Path]) -> Path:
        candidate = Path(decoded_path)
        if candidate.is_absolute():
            raise LookupError("Poster not found")

        normalized_parts = []
        for part in candidate.parts:
            if part in {"", "."}:
                continue
            if part == "..":
                raise LookupError("Poster not found")
            normalized_parts.append(part)

        if not normalized_parts:
            raise LookupError("Poster not found")

        normalized_path = Path(*normalized_parts)
        for root in media_roots:
            resolved_root = root.resolve()
            resolved_path = (resolved_root / normalized_path).resolve(strict=False)

            try:
                resolved_path.relative_to(resolved_root)
            except ValueError:
                continue

            if resolved_path.is_file():
                return resolved_path

        raise LookupError("Poster not found")

    @staticmethod
    def _guess_image_media_type(file_path: Path) -> str:
        media_type, _ = mimetypes.guess_type(file_path.name)
        if media_type and media_type.startswith("image/"):
            return media_type
        return "image/jpeg"

    @staticmethod
    def _get_media_root(session: Session, file_record: ScannedFile) -> Optional[Path]:
        media_path = session.get(MediaPath, file_record.path_id)
        return Path(media_path.path) if media_path else None

    @staticmethod
    def get_file_metadata(session: Session, file_id: int) -> dict:
        file_record = session.get(ScannedFile, file_id)
        if not file_record:
            raise LookupError("File not found")

        file_path = Path(file_record.file_path)
        folder = file_path.parent
        media_root = MetadataService._get_media_root(session, file_record)

        is_tv = file_record.type == "tv"
        if is_tv and media_root and file_record.extracted_title:
            show_root = media_root / file_record.extracted_title
        else:
            show_root = folder

        nfo_data = None
        nfo_path = None
        if is_tv:
            tvshow_nfo = show_root / "tvshow.nfo"
            if tvshow_nfo.exists():
                nfo_path = tvshow_nfo
                nfo_data = MetadataService.parse_nfo(nfo_path)

        if not nfo_path:
            nfo_path = MetadataService.find_nfo_file(folder, file_record.filename)
            if nfo_path:
                nfo_data = MetadataService.parse_nfo(nfo_path)

        poster_path = None
        fanart_path = None
        if is_tv and show_root.exists():
            poster_path = MetadataService.find_poster(show_root, file_record.filename)
            fanart_path = MetadataService.find_fanart(show_root, file_record.filename)

        if not poster_path:
            poster_path = MetadataService.find_poster(folder, file_record.filename)
        if not fanart_path:
            fanart_path = MetadataService.find_fanart(folder, file_record.filename)

        txt_info = None
        txt_path = MetadataService.find_txt_file(folder, file_record.filename)
        if txt_path:
            txt_info = MetadataService.parse_txt_info(txt_path)

        poster_relative = None
        fanart_relative = None
        if poster_path and media_root:
            try:
                poster_relative = str(poster_path.relative_to(media_root))
            except ValueError:
                poster_relative = poster_path.name
        elif poster_path:
            poster_relative = poster_path.name

        if fanart_path and media_root:
            try:
                fanart_relative = str(fanart_path.relative_to(media_root))
            except ValueError:
                fanart_relative = fanart_path.name
        elif fanart_path:
            fanart_relative = fanart_path.name

        return {
            "file_id": file_id,
            "filename": file_record.filename,
            "nfo_data": nfo_data,
            "poster_path": poster_relative,
            "fanart_path": fanart_relative,
            "txt_info": txt_info,
        }

    @staticmethod
    def resolve_poster(session: Session, encoded_path: str) -> tuple[Path, str]:
        decoded_path = unquote(encoded_path)
        media_roots = [Path(media_path.path) for media_path in session.exec(select(MediaPath)).all()]
        if not media_roots:
            raise LookupError("Poster not found")
        poster_path = MetadataService._resolve_media_asset_path(decoded_path, media_roots)
        return poster_path, MetadataService._guess_image_media_type(poster_path)

    @staticmethod
    def parse_nfo(nfo_path: Path) -> Optional[dict]:
        """Parse NFO file and extract metadata"""
        return metadata_module.parse_nfo(nfo_path)

    @staticmethod
    def find_poster(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
        """Find poster image in folder"""
        return metadata_module.find_poster(folder, video_filename)

    @staticmethod
    def find_fanart(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
        """Find fanart image in folder"""
        return metadata_module.find_fanart(folder, video_filename)

    @staticmethod
    def parse_txt_info(txt_path: Path) -> Optional[dict]:
        """Parse TXT file with key:value metadata"""
        return metadata_module.parse_txt_info(txt_path)

    @staticmethod
    def find_nfo_file(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
        """Find NFO file in folder"""
        return metadata_module.find_nfo_file(folder, video_filename)

    @staticmethod
    def find_txt_file(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
        """Find TXT metadata file in folder"""
        return metadata_module.find_txt_file(folder, video_filename)
