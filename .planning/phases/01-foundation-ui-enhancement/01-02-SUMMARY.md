---
phase: 01-foundation-ui-enhancement
plan: 02
subsystem: Backend Metadata
tags: [metadata, nfo, poster, api]
dependency_graph:
  requires:
    - UI-01 (plan 01-01)
  provides:
    - META-01
    - META-02
    - META-03
  affects:
    - Frontend (for displaying metadata)
tech_stack:
  added:
    - xml.etree.ElementTree (NFO parsing)
  patterns:
    - Multi-encoding fallback (UTF-8, GBK, GB2312)
    - XBMC/Kodi NFO format support
key_files:
  created:
    - app/core/metadata.py
  modified:
    - app/api/media.py
decisions:
  - Use xml.etree.ElementTree for NFO parsing (simple, no extra dependencies)
  - Support multiple poster file names (folder.jpg, poster.jpg, etc.)
  - Return relative poster path for frontend URL construction
metrics:
  duration: 2m
  completed_date: 2026-03-13
---

# Phase 1 Plan 2: Backend Metadata Extraction Summary

## One-liner
Metadata extraction module with NFO parsing, poster detection, and TXT fallback API endpoints.

## Overview
Implemented backend metadata extraction capabilities including NFO file parsing, poster image detection, and TXT fallback support. Added API endpoints for retrieving metadata and serving poster images.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create metadata extraction module | 0f4cea0 | app/core/metadata.py |
| 2 | Add metadata API endpoint | 2f675cb | app/api/media.py |
| 3 | Add poster image serving endpoint | 2f675cb | app/api/media.py |

## Implementation Details

### Metadata Extraction Module (app/core/metadata.py)
- `parse_nfo(nfo_path)` - Parse XBMC/Kodi NFO format using xml.etree.ElementTree
- Multiple encoding support: UTF-8, GBK, GB2312
- Extracts: title, year, plot, rating, genres, director, actor, studio, mpaa, runtime
- `find_poster(folder)` - Detect poster images in folder
  - Checks: folder.jpg, poster.jpg, poster.png, folder.png
  - Also supports same-name poster (video.mp4 -> video.jpg)
- `parse_txt_info(txt_path)` - Simple key:value parsing fallback
- Helper functions: find_nfo_file, find_txt_file, get_folder_from_path

### API Endpoints (app/api/media.py)
- **GET /media/metadata/{file_id}** - Returns metadata for a media file
  - Looks up ScannedFile by ID
  - Calls parse_nfo, find_poster, parse_txt_info
  - Returns: {file_id, filename, nfo_data, poster_path, txt_info}
  - Returns 404 if file not found

- **GET /media/poster** - Serve poster images
  - Accepts URL-encoded relative path
  - Supports jpg, png, gif, webp formats
  - Returns 404 if not found

## API Response Examples

### GET /media/metadata/{file_id}
```json
{
  "file_id": 1,
  "filename": "Avatar.mkv",
  "nfo_data": {
    "title": "Avatar",
    "year": "2009",
    "plot": "A paraplegic Marine...",
    "rating": "7.9",
    "genres": ["Action", "Adventure", "Fantasy"],
    "director": "James Cameron"
  },
  "poster_path": "Movies/Avatar/folder.jpg",
  "txt_info": null
}
```

## Verification
- Code passes ruff check and format
- Module imports verified
- API imports verified

## Deviations from Plan
None - plan executed exactly as written.

## Requirements Met
- META-01: NFO parsing with multiple encoding support
- META-02: Poster detection in local folder
- META-03: TXT fallback parsing

## Self-Check
- [x] metadata.py created with all parsing functions
- [x] API endpoint returns NFO, poster, TXT data
- [x] Poster serving endpoint works for valid paths
- [x] Code passes linting and formatting
- [x] All modules import correctly
