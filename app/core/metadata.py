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

def find_fanart(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
    """Find fanart image in folder (prioritize fanart over poster)."""
    if not folder.exists() or not folder.is_dir():
        return None
    
    for name in FANART_NAMES:
        path = folder / name
        if path.exists():
            return path
            
    if video_filename:
        video_stem = Path(str(video_filename)).stem
        for ext in [".jpg", ".jpeg", ".png"]:
            path = folder / f"{video_stem}-fanart{ext}"
            if path.exists():
                return path
    return None



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

    # Try different encodings
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

    # Root can be <movie>, <tvshow>, <episodedetails> or a wrapper
    # If root's tag is one of these, use root as the main element
    target = root
    if root.tag not in ["movie", "tvshow", "episodedetails"]:
        for tag in ["movie", "tvshow", "episodedetails"]:
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
        # 1. Try <ratings><rating><value>
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
        
        # 2. Try top-level <rating> or <userrating>
        for tag in ["rating", "userrating"]:
            node = element.find(tag)
            if node is not None and node.text:
                try:
                    val = float(node.text.strip())
                    if val > 0:  # Ignore 0.0 scores if possible
                        return f"{val:.1f}"
                except ValueError:
                    return node.text.strip()
                
        return None

    def get_all_text(element: ET.Element, tag: str) -> list:
        """Get all text contents of a tag (for genres, etc.)."""
        found = element.findall(tag)
        return [f.text.strip() for f in found if f.text and f.text.strip()]

    # Extract metadata
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

    # Clean up None values
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
    if not folder.exists() or not folder.is_dir():
        return None

    # Check standard poster names
    for poster_name in POSTER_NAMES:
        poster_path = folder / poster_name
        if poster_path.exists():
            return poster_path

    # Check for same-name poster (video.mp4 -> video.jpg)
    if video_filename:
        video_stem = Path(video_filename).stem
        for ext in [".jpg", ".jpeg", ".png"]:
            poster_path = folder / f"{video_stem}{ext}"
            if poster_path.exists():
                return poster_path

    return None


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

    try:
        content = txt_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            content = txt_path.read_text(encoding="gbk")
        except UnicodeDecodeError:
            logger.warning(f"Failed to read TXT file {txt_path}")
            return None

    # Parse key:value lines
    metadata = {}
    for line in content.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue

        # Split on first colon only
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key in ["title", "year", "plot", "description"]:
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
    if not folder.exists() or not folder.is_dir():
        return None

    # Check for movie.nfo
    nfo_path = folder / "movie.nfo"
    if nfo_path.exists():
        return nfo_path

    # Check for same-name NFO (video.mp4 -> video.nfo)
    if video_filename:
        video_stem = Path(str(video_filename)).stem
        nfo_path = folder / f"{video_stem}.nfo"
        if nfo_path.exists():
            return nfo_path

    return None


def find_txt_file(folder: Path, video_filename: Optional[str] = None) -> Optional[Path]:
    """
    Find TXT metadata file in folder.

    Args:
        folder: Folder to search for TXT files
        video_filename: Optional video filename to check for same-name TXT

    Returns:
        Path to TXT file or None if not found
    """
    if not folder.exists() or not folder.is_dir():
        return None

    # Check for info.txt
    txt_path = folder / "info.txt"
    if txt_path.exists():
        return txt_path

    # Check for same-name TXT (video.mp4 -> video.txt)
    if video_filename:
        video_stem = Path(str(video_filename)).stem
        txt_path = folder / f"{video_stem}.txt"
        if txt_path.exists():
            return txt_path

    return None
