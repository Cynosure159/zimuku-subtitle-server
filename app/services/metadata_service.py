from pathlib import Path
from typing import Optional

from ..core import metadata as metadata_module


class MetadataService:
    """Service layer for metadata extraction, encapsulating Core metadata module"""

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
