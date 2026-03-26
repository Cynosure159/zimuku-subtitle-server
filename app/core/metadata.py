"""Metadata extraction module for NFO, poster images, and TXT fallback."""

import logging
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Supported encodings for NFO parsing
NFO_ENCODINGS = ["utf-8", "gbk", "gb2312"]

# Poster file names to search for
POSTER_NAMES = ["folder.jpg", "poster.jpg", "poster.png", "folder.png"]

# Fanart file names to search for (for banner backgrounds)
FANART_NAMES = ["fanart.jpg", "fanart.png", "backdrop.jpg", "background.jpg"]
IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"]
MEDIA_ROOT_TAGS = ["movie", "tvshow", "episodedetails"]
TXT_METADATA_KEYS = {"title", "year", "plot", "description"}


def _is_searchable_folder(folder: Path) -> bool:
    return folder.exists() and folder.is_dir()


def _find_first_existing(folder: Path, names: list[str]) -> Optional[Path]:
    for name in names:
        candidate = folder / name
        if candidate.exists():
            return candidate
    return None


def _find_stem_match(folder: Path, video_filename: Optional[str], suffixes: list[str]) -> Optional[Path]:
    if not video_filename:
        return None

    video_stem = Path(str(video_filename)).stem
    for suffix in suffixes:
        candidate = folder / f"{video_stem}{suffix}"
        if candidate.exists():
            return candidate
    return None


def _read_text_with_encodings(file_path: Path, encodings: list[str]) -> Optional[str]:
    for encoding in encodings:
        try:
            return file_path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return None


def find_fanart(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
    """Find fanart image in folder (prioritize fanart over poster)."""
    if not _is_searchable_folder(folder):
        return None

    fanart_path = _find_first_existing(folder, FANART_NAMES)
    if fanart_path is not None:
        return fanart_path

    return _find_stem_match(folder, video_filename, [f"-fanart{ext}" for ext in IMAGE_EXTENSIONS])


def parse_nfo(nfo_path: Path) -> Optional[dict]:
    """
    Parse NFO file and extract metadata.

    Args:
        nfo_path: Path to the NFO file

    Returns:
        Dictionary with title, year, plot, rating, genres, director or None if parsing fails
    """
    if not nfo_path.exists():
        return None

    for encoding in NFO_ENCODINGS:
        try:
            content = nfo_path.read_text(encoding=encoding)
            return _extract_nfo_metadata(content)
        except (UnicodeDecodeError, ET.ParseError) as e:
            logger.debug(f"Failed to parse {nfo_path} with {encoding}: {e}")
            continue

    logger.warning(f"Failed to parse NFO file {nfo_path} with any supported encoding")
    return None


def _extract_nfo_metadata(content: str) -> dict:
    """Extract metadata from NFO XML content."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return {}

    target = root
    if root.tag not in MEDIA_ROOT_TAGS:
        for tag in MEDIA_ROOT_TAGS:
            found = root.find(tag)
            if found is not None:
                target = found
                break

    def get_text(element: ET.Element, tag: str) -> Optional[str]:
        """Get text content of a tag."""
        found = element.find(tag)
        return found.text.strip() if found is not None and found.text else None

    def get_rating(element: ET.Element) -> Optional[str]:
        """Extract rating from various NFO structures."""
        ratings_node = element.find("ratings")
        if ratings_node is not None:
            rating_node = ratings_node.find("rating")
            if rating_node is not None:
                value_node = rating_node.find("value")
                if value_node is not None and value_node.text:
                    try:
                        val = float(value_node.text.strip())
                        return f"{val:.1f}"
                    except ValueError:
                        return value_node.text.strip()

        for tag in ["rating", "userrating"]:
            node = element.find(tag)
            if node is not None and node.text:
                try:
                    val = float(node.text.strip())
                    if val > 0:
                        return f"{val:.1f}"
                except ValueError:
                    return node.text.strip()

        return None

    def get_all_text(element: ET.Element, tag: str) -> list:
        """Get all text contents of a tag (for genres, etc.)."""
        found = element.findall(tag)
        return [f.text.strip() for f in found if f.text and f.text.strip()]

    metadata = {
        "title": get_text(target, "title"),
        "year": get_text(target, "year"),
        "plot": get_text(target, "plot"),
        "rating": get_rating(target),
        "genres": get_all_text(target, "genre"),
        "director": get_text(target, "director"),
        "actor": get_all_text(target, "actor"),
        "studio": get_text(target, "studio"),
        "mpaa": get_text(target, "mpaa"),
        "runtime": get_text(target, "runtime"),
    }

    return {k: v for k, v in metadata.items() if v is not None}


def find_poster(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
    """
    Find poster image in folder.

    Args:
        folder: Folder to search for poster images
        video_filename: Optional video filename to check for same-name poster

    Returns:
        Path to poster image or None if not found
    """
    if not _is_searchable_folder(folder):
        return None

    poster_path = _find_first_existing(folder, POSTER_NAMES)
    if poster_path is not None:
        return poster_path

    return _find_stem_match(folder, video_filename, IMAGE_EXTENSIONS)


def parse_txt_info(txt_path: Path) -> Optional[dict]:
    """
    Parse TXT file with key:value metadata.

    Args:
        txt_path: Path to the TXT file

    Returns:
        Dictionary with title, year, plot, description or None if parsing fails
    """
    if not txt_path.exists():
        return None

    content = _read_text_with_encodings(txt_path, ["utf-8", "gbk"])
    if content is None:
        logger.warning(f"Failed to read TXT file {txt_path}")
        return None

    metadata = {}
    for line in content.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue

        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key in TXT_METADATA_KEYS:
            metadata[key] = value

    return metadata if metadata else None


def get_folder_from_path(file_path: str) -> Path:
    """Get the folder containing the file."""
    return Path(file_path).parent


def find_nfo_file(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
    """
    Find NFO file in folder.

    Args:
        folder: Folder to search for NFO files
        video_filename: Optional video filename to check for same-name NFO

    Returns:
        Path to NFO file or None if not found
    """
    if not _is_searchable_folder(folder):
        return None

    nfo_path = _find_first_existing(folder, ["movie.nfo"])
    if nfo_path is not None:
        return nfo_path
    return _find_stem_match(folder, video_filename, [".nfo"])


def find_txt_file(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
    """
    Find TXT metadata file in folder.

    Args:
        folder: Folder to search for TXT files
        video_filename: Optional video filename to check for same-name TXT

    Returns:
        Path to TXT file or None if not found
    """
    if not _is_searchable_folder(folder):
        return None

    txt_path = _find_first_existing(folder, ["info.txt"])
    if txt_path is not None:
        return txt_path
    return _find_stem_match(folder, video_filename, [".txt"])
