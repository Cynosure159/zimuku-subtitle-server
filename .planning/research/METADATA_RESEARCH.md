# Technology Stack: Video Metadata Extraction

**Project:** Zimuku Subtitle Server
**Researched:** 2026-03-13

## Recommended Stack

### Core Dependencies (Already Available)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `lxml` | (in requirements) | XML parsing for NFO files | Already installed, robust XML/HTML parsing |
| `xml.etree.ElementTree` | (stdlib) | Lightweight XML parsing | No additional dependency, sufficient for simple NFO |
| `Pillow` | latest (11.x) | Image processing for posters | Industry standard, handles all common formats |

### New Dependencies Required

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| `Pillow` | 11.x | Extract image dimensions, format, serve thumbnails | Always for poster extraction |
| (none others) | - | - | Using stdlib + lxml is sufficient |

### Installation

```bash
# Core (already installed)
pip install lxml

# New dependency for images
pip install Pillow
```

## NFO File Parsing Strategy

### NFO Format Overview

NFO files are XML documents used by media centers (Kodi, Plex, Ember Media Manager). Two main variants:

**Kodi-style (most common):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<movie>
  <title>Movie Title</title>
  <year>2024</year>
  <plot>Full plot description...</plot>
  <outline>Short summary...</outline>
  <rating>8.5</rating>
  <genre>Action</genre>
  <genre>Adventure</genre>
  <director>Director Name</director>
  <actor>
    <name>Actor Name</name>
    <role>Character Name</role>
  </actor>
  <thumb>/path/to/poster.jpg</thumb>
  <premiered>2024-05-01</premiered>
  <studio>Studio Name</studio>
</movie>
```

**TV Show (episodedetails):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<episodedetails>
  <title>Episode Title</title>
  <season>1</season>
  <episode>5</episode>
  <plot>Episode plot...</plot>
  <aired>2024-03-15</aired>
</episodedetails>
```

### Recommended Parsing Approach

Use `lxml.etree` for robust parsing with fallback to `xml.etree.ElementTree`:

```python
from lxml import etree
from pathlib import Path

def parse_nfo(nfo_path: Path) -> dict | None:
    """Parse NFO file and extract metadata."""
    try:
        # Try lxml first (more robust)
        tree = etree.parse(str(nfo_path))
        root = tree.getroot()
    except Exception:
        try:
            # Fallback to stdlib
            import xml.etree.ElementTree as ET
            tree = ET.parse(str(nfo_path))
            root = tree.getroot()
        except Exception:
            return None

    # Extract fields based on root element
    metadata = {}

    # Common fields for both movie and episode
    for field in ['title', 'year', 'plot', 'outline', 'rating', 'premiered', 'aired', 'studio']:
        elem = root.find(field)
        if elem is not None and elem.text:
            metadata[field] = elem.text.strip()

    # Genres (can be multiple)
    genres = root.findall('genre')
    if genres:
        metadata['genres'] = [g.text.strip() for g in genres if g.text]

    # Actors
    actors = root.findall('.//actor')
    if actors:
        metadata['actors'] = [
            {'name': a.find('name').text.strip() if a.find('name') is not None else None,
             'role': a.find('role').text.strip() if a.find('role') is not None else None}
            for a in actors if a.find('name') is not None
        ]

    # Director
    director = root.find('director')
    if director is not None and director.text:
        metadata['director'] = director.text.strip()

    # Thumb/posters
    thumb = root.find('thumb')
    if thumb is not None:
        # Can be attribute or text
        metadata['poster'] = thumb.get('url') or (thumb.text.strip() if thumb.text else None)

    # Fanart
    fanart = root.find('fanart')
    if fanart is not None:
        fanart_thumb = fanart.find('thumb')
        if fanart_thumb is not None:
            metadata['fanart'] = fanart_thumb.get('url') or fanart_thumb.text

    return metadata if metadata else None
```

## TXT File Parsing Strategy

### Common TXT Metadata Formats

TXT files are less standardized. Common patterns:

1. **Filename-based:** `Movie.Title.2024.txt` - parse using existing `parse_media_filename()`
2. **Key-value format:**
   ```
   Title: Movie Name
   Year: 2024
   Plot: Description here
   ```
3. **Plain text:** Use first N lines as overview

### Recommended Approach

```python
import re
from pathlib import Path

def parse_txt_metadata(txt_path: Path) -> dict | None:
    """Parse TXT file for metadata."""
    try:
        content = txt_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        try:
            content = txt_path.read_text(encoding='gbk')
        except Exception:
            return None

    metadata = {}
    lines = content.split('\n')

    # Try key-value pattern first
    kv_pattern = re.compile(r'^([^:]+):\s*(.+)$')
    for line in lines:
        match = kv_pattern.match(line.strip())
        if match:
            key, value = match.groups()
            key_lower = key.lower().strip()
            if key_lower in ['title', 'year', 'plot', 'overview', 'summary']:
                metadata[key_lower] = value.strip()

    # If no key-value found, use first non-empty line as title
    if not metadata and lines:
        for line in lines:
            if line.strip():
                metadata['title'] = line.strip()
                break

    return metadata if metadata else None
```

## Image (Poster) Handling

### Common Poster Locations

Media servers look for posters in predictable locations:

| Pattern | Example | Priority |
|---------|---------|----------|
| Same folder, same name | `/movies/Movie/poster.jpg` | 1 |
| Same folder, specific name | `/movies/Movie/folder.jpg` | 2 |
| Extrafanart folder | `/movies/Movie/extrafanart/fanart1.jpg` | 3 |
| NFO-specified path | `<thumb>` from NFO | 4 |

### Common Image Extensions

Posters: `.jpg`, `.jpeg`, `.png`, `.webp`
Fanart: `.jpg`, `.jpeg`, `.png`, `.webp`

### Recommended Approach

```python
from pathlib import Path
from PIL import Image
from typing import Optional

POSTER_PATTERNS = [
    'folder.jpg', 'folder.png', 'folder.webp',
    'poster.jpg', 'poster.png', 'poster.webp',
    'thumb.jpg', 'thumb.png', 'thumb.webp',
]

def find_poster(video_path: Path) -> Optional[Path]:
    """Find poster image in video directory."""
    parent = video_path.parent

    # 1. Same-name poster (e.g., video.mkv -> poster.jpg)
    same_name_poster = parent / f"{video_path.stem}.jpg"
    if same_name_poster.exists():
        return same_name_poster

    # 2. Standard poster names
    for pattern in POSTER_PATTERNS:
        poster = parent / pattern
        if poster.exists():
            return poster

    return None

def get_image_info(image_path: Path) -> dict:
    """Extract image metadata."""
    with Image.open(image_path) as img:
        return {
            'width': img.width,
            'height': img.height,
            'format': img.format,
            'mode': img.mode,
            'size_bytes': image_path.stat().st_size,
        }
```

## Integration with Existing Architecture

### Database Model Extension

Add metadata fields to `ScannedFile`:

```python
class ScannedFile(SQLModel, table=True):
    # ... existing fields ...

    # New metadata fields
    nfo_title: Optional[str] = None
    nfo_year: Optional[str] = None
    nfo_plot: Optional[str] = None
    nfo_rating: Optional[float] = None
    nfo_genres: Optional[str] = None  # JSON string
    nfo_director: Optional[str] = None
    nfo_actors: Optional[str] = None  # JSON string
    poster_path: Optional[str] = None
    poster_width: Optional[int] = None
    poster_height: Optional[int] = None
```

### Service Layer Extension

Add to `MediaService`:

```python
class MediaService:
    @staticmethod
    def extract_metadata(video_path: Path) -> dict:
        """Extract all metadata from video directory."""
        metadata = {}

        # 1. Try NFO file
        nfo_path = video_path.parent / f"{video_path.stem}.nfo"
        if nfo_path.exists():
            nfo_data = parse_nfo(nfo_path)
            if nfo_data:
                metadata.update(nfo_data)

        # 2. Try TXT file
        if not metadata:
            txt_path = video_path.parent / f"{video_path.stem}.txt"
            if txt_path.exists():
                txt_data = parse_txt_metadata(txt_path)
                if txt_data:
                    metadata.update(txt_data)

        # 3. Find poster
        poster = find_poster(video_path)
        if poster:
            metadata['poster_path'] = str(poster)
            metadata.update(get_image_info(poster))

        return metadata
```

## Complexity Assessment

| Task | Complexity | Dependencies | Notes |
|------|------------|--------------|-------|
| NFO parsing (lxml) | Low | lxml (installed) | Standard XML, well-documented format |
| NFO parsing (stdlib) | Low | stdlib | Simpler but less robust encoding handling |
| TXT parsing | Low | stdlib | Regex-based, forgiving |
| Poster finding | Low | stdlib | Pattern matching |
| Image metadata (Pillow) | Low | Pillow (new) | Simple API, one function call |
| API endpoint for poster | Low | stdlib + FastAPI | StreamFileResponse |

## Sources

- Kodi NFO format: https://kodi.wiki/view/NFO_files
- lxml documentation: https://lxml.de/
- Pillow documentation: https://pillow.readthedocs.io/
- Standard media organization: https://support.plex.tv/articles/naming-and-organizing-your-movie-media-files/
