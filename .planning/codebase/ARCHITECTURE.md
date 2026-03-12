# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** Layered Architecture with Service-Oriented Design

**Key Characteristics:**
- Clear separation between API routes, Service layer, and Core business logic
- Database layer using SQLModel with SQLite
- Background task processing via FastAPI BackgroundTasks
- MCP (Model Context Protocol) integration for AI-driven automation
- Asynchronous operations using httpx and asyncio

## Layers

**API Layer (`app/api/`):**
- Purpose: REST API route handlers
- Location: `app/api/`
- Contains: FastAPI routers for media, search, tasks, settings, system
- Depends on: Services layer
- Used by: FastAPI app entry point

**Service Layer (`app/services/`):**
- Purpose: Business logic orchestration
- Location: `app/services/`
- Contains: MediaService, SearchService, TaskService, SystemService
- Depends on: Core modules, Database models
- Used by: API routes, MCP server

**Core Layer (`app/core/`):**
- Purpose: Low-level business logic and utilities
- Location: `app/core/`
- Contains: scraper.py, archive.py, ocr.py, config.py, utils.py
- Depends on: External libraries (httpx, BeautifulSoup, etc.)
- Used by: Services layer

**Database Layer (`app/db/`):**
- Purpose: Data persistence and session management
- Location: `app/db/`
- Contains: SQLModel definitions, SQLAlchemy engine/session
- Depends on: SQLModel
- Used by: All layers requiring data persistence

**MCP Layer (`app/mcp/`):**
- Purpose: AI tool integration via MCP protocol
- Location: `app/mcp/server.py`
- Depends on: Services layer
- Used by: Claude Code and other MCP clients

## Data Flow

**Subtitle Search and Download:**

1. Client -> API (`app/api/search.py`)
2. API -> SearchService (`app/services/search_service.py`)
3. SearchService -> ZimukuAgent (`app/core/scraper.py`)
4. ZimukuAgent -> External Zimuku Website (HTTP requests)
5. Results cached in SQLite via SearchCache model
6. Response returned to client

**Media Auto-Match Process:**

1. Client triggers via API (`app/api/media.py`)
2. API -> MediaService (`app/services/media_service.py`)
3. MediaService scans filesystem for video files
4. For each unmatched file: ZimukuAgent.search() -> download -> ArchiveManager.extract()
5. Subtitle moved to video directory with matching filename

**Task-Based Download:**

1. Client creates task via API (`app/api/tasks.py`)
2. API -> TaskService (`app/services/task_service.py`)
3. TaskService creates SubtitleTask in database
4. Background processing downloads and processes subtitle
5. Status stored in database, polled by client

**State Management:**
- Global task status stored in `MediaTaskStatus` class (in-memory)
- Database records for persistent state (ScannedFile, SubtitleTask, etc.)
- Frontend uses polling via custom `useMediaPolling` hook

## Key Abstractions

**ZimukuAgent:**
- Purpose: Web scraper for zimuku.org
- Examples: `app/core/scraper.py`
- Pattern: Three-layer progressive matching (search page -> season detail -> fallback)

**ArchiveManager:**
- Purpose: ZIP/7z extraction with encoding fixes
- Examples: `app/core/archive.py`
- Pattern: Wrapper around shutil and zipfile with CP437->GBK conversion

**ConfigManager:**
- Purpose: Dynamic configuration from database/environment
- Examples: `app/core/config.py`
- Pattern: Singleton class with fallback chain (DB -> ENV -> defaults)

## Entry Points

**FastAPI Application:**
- Location: `app/main.py`
- Triggers: `uvicorn app.main:app --reload`
- Responsibilities: App initialization, router registration, lifespan management, global exception handling

**MCP Server:**
- Location: `app/mcp/server.py`
- Triggers: `python run_mcp.py`
- Responsibilities: Exposes search/download as AI-callable tools

**Background Tasks:**
- Location: Triggered from API routes via `BackgroundTasks`
- Responsibilities: Long-running operations (media scan, auto-match, download)

## Error Handling

**Strategy:** Global exception handler with structured JSON responses

**Patterns:**
- Global exception handler in `app/main.py` returns 500 with error details
- Service layer catches exceptions and logs with context
- HTTPException for API-level errors (400, 404, etc.)
- Database exceptions handled gracefully with fallbacks

## Cross-Cutting Concerns

**Logging:** Python standard logging with configurable level via `LOG_LEVEL` env var

**Validation:** FastAPI Query parameter validation (regex patterns), Pydantic-style validation

**Authentication:** None implemented (local-only service)

---

*Architecture analysis: 2026-03-12*
