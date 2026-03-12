# Codebase Structure

**Analysis Date:** 2026-03-12

## Directory Layout

```
zimuku-subtitle-server/
├── app/                    # Main backend application
│   ├── api/               # REST API route handlers
│   ├── core/              # Core business logic
│   ├── db/                # Database models and session
│   ├── services/          # Service layer
│   ├── mcp/               # MCP protocol server
│   └── main.py            # FastAPI app entry point
├── frontend/              # React frontend
│   └── src/
│       ├── components/    # React components
│       ├── pages/         # Page components
│       ├── hooks/         # Custom React hooks
│       └── api.ts         # API client
├── tests/                 # Test files
├── storage/               # Runtime data (db, subtitles)
└── run_mcp.py             # MCP entry point
```

## Directory Purposes

**app/api/:**
- Purpose: REST API route handlers
- Contains: media.py, search.py, tasks.py, settings.py, system.py
- Key files: `app/api/media.py` - media path and file management

**app/core/:**
- Purpose: Low-level business logic
- Contains: scraper.py, archive.py, ocr.py, config.py, utils.py
- Key files: `app/core/scraper.py` - Zimuku web scraping

**app/db/:**
- Purpose: Database layer
- Contains: models.py (SQLModel definitions), session.py (engine/session)
- Key files: `app/db/models.py` - Setting, SearchCache, SubtitleTask, MediaPath, ScannedFile

**app/services/:**
- Purpose: Business logic orchestration
- Contains: media_service.py, search_service.py, task_service.py, system_service.py
- Key files: `app/services/media_service.py` - scan and auto-match logic

**app/mcp/:**
- Purpose: MCP protocol server for AI integration
- Contains: server.py
- Key files: `app/mcp/server.py`

**frontend/src/components/:**
- Purpose: Reusable React components
- Contains: MediaConfigPanel, MediaSidebar, MediaInfoCard, EmptySelectionState
- Key files: `frontend/src/components/MediaConfigPanel.tsx`

**frontend/src/pages/:**
- Purpose: Page-level components
- Contains: SearchPage, MoviesPage, SeriesPage, TasksPage, SettingsPage

**frontend/src/hooks/:**
- Purpose: Custom React hooks
- Contains: useMediaPolling.ts

## Key File Locations

**Entry Points:**
- `app/main.py`: FastAPI application (run via `uvicorn app.main:app --reload`)
- `run_mcp.py`: MCP server startup
- `frontend/src/main.tsx`: React app entry point

**Configuration:**
- `app/core/config.py`: Configuration management (ConfigManager class)
- `pyproject.toml`: Python project configuration
- `frontend/package.json`: Node dependencies and scripts

**Core Logic:**
- `app/core/scraper.py`: ZimukuAgent - three-layer progressive matching strategy
- `app/core/archive.py`: ArchiveManager - ZIP/7z extraction with encoding fixes
- `app/core/ocr.py`: SimpleOCREngine - captcha recognition

**Testing:**
- `tests/`: pytest test files (test_scraper.py, test_api.py, test_media_scan.py, etc.)

## Naming Conventions

**Files:**
- Python: snake_case (e.g., `media_service.py`, `scraper.py`)
- TypeScript/React: PascalCase (e.g., `SearchPage.tsx`, `MediaConfigPanel.tsx`)

**Directories:**
- Python: snake_case (e.g., `app/services/`, `app/core/`)
- Frontend: PascalCase for components, camelCase for hooks

**Functions/Methods:**
- Python: snake_case (e.g., `run_media_scan_and_match`)
- TypeScript: camelCase (e.g., `useMediaPolling`)

**Classes:**
- Python: PascalCase (e.g., `ZimukuAgent`, `MediaService`, `ConfigManager`)
- React: PascalCase (e.g., `MediaConfigPanel`)

**Database Models:**
- Python: PascalCase (e.g., `Setting`, `SubtitleTask`, `MediaPath`)

## Where to Add New Code

**New API Endpoint:**
- Primary: `app/api/{domain}.py`
- Register router in `app/main.py`

**New Service:**
- Primary: `app/services/{name}_service.py`
- Follow existing service patterns (static methods)

**New Core Module:**
- Primary: `app/core/{module_name}.py`
- Keep focused on single responsibility

**New Database Model:**
- Primary: `app/db/models.py`
- Add SQLModel class with Field definitions

**New Frontend Component:**
- Reusable: `frontend/src/components/{Name}.tsx`
- Page: `frontend/src/pages/{Name}Page.tsx`

**New Test:**
- Primary: `tests/test_{module}.py`

**New Utility:**
- Core utility: `app/core/utils.py`
- General: Add to appropriate service or create new module

---

*Structure analysis: 2026-03-12*
