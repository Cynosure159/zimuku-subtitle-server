# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

### Python Backend

**Files:**
- Modules: `snake_case.py` (e.g., `scraper.py`, `media_service.py`)
- Test files: `test_*.py` (e.g., `test_scraper.py`, `test_api.py`)

**Functions:**
- `snake_case` for all functions and methods
- Prefix with underscore for private methods: `_extract_sub_from_search_page()`
- Use descriptive verb/noun patterns: `get_download_page_links()`, `run_media_scan_and_match()`

**Variables:**
- `snake_case`: `media_path`, `task_id`, `is_scanning`
- Constants: `UPPER_SNAKE_CASE`: `FILE_MIN_SIZE`, `_CHINESE_NUMBERS`

**Classes:**
- `PascalCase`: `ZimukuAgent`, `MediaService`, `SubtitleResult`
- Internal classes: `MediaTaskStatus`

**Types (TypeScript-like annotations):**
- Use Python type hints: `def func(param: str) -> List[dict]:`

### Frontend

**Files:**
- Components: `PascalCase.tsx` (e.g., `SearchPage.tsx`, `MediaInfoCard.tsx`)
- Hooks: `camelCase.ts` (e.g., `useMediaPolling.ts`)
- API: `camelCase.ts` (e.g., `api.ts`)

**Functions/Variables:**
- `camelCase`: `listMediaPaths`, `fetchData`, `mediaStatus`

**Components:**
- `PascalCase`: `SearchPage`, `MediaSidebar`, `EmptySelectionState`

## Code Style

### Python Backend

**Formatting Tool:** Ruff
- Config: `pyproject.toml`
- Line length: 120 characters
- Quote style: double quotes
- Indent: spaces

**Linting:** Ruff with rules `E`, `F`, `W`, `I`
- `E`: pycodestyle errors
- `F`: Pyflakes
- `W`: warnings
- `I`: isort import sorting

**Run commands:**
```bash
ruff check .
ruff format .
```

### Frontend

**Formatting:** Prettier (via ESLint integration)
**Linting:** ESLint 9.x with TypeScript support

**Run commands:**
```bash
npm run lint
npm run build
```

## Import Organization

### Python Backend

**Order (following Ruff isort):**
1. Standard library: `import logging`, `import re`
2. Third-party: `import httpx`, `from fastapi import APIRouter`
3. Local application: `from .ocr import SimpleOCREngine`, `from ..db.session import get_session`

**Path aliases:** Not used; relative imports are used for local modules

### Frontend

**Order:**
1. React/Router: `import { BrowserRouter } from 'react-router-dom'`
2. Components/Pages: `import SearchPage from './pages/SearchPage'`
3. Hooks: `import { useState, useEffect } from 'react'`
4. API: `import { listMediaPaths } from '../api'`

## Error Handling

### Python Backend

**API Layer:**
- Use FastAPI's `HTTPException` for user-facing errors:
  ```python
  from fastapi import HTTPException

  if not found:
      raise HTTPException(status_code=404, detail="Path not found")
  ```

**Service Layer:**
- Raise `ValueError` for invalid arguments:
  ```python
  if existing:
      raise ValueError("Path already exists")
  ```

**Global Handler:**
- `app/main.py` has `@app.exception_handler(Exception)` for uncaught exceptions
- Returns JSON response with 500 status

**Logging:**
- Use `logging.getLogger(__name__)` for each module
- Levels: `logger.error()`, `logger.warning()`, `logger.info()`
- Include context in messages: `logger.error(f"数据库表初始化失败: {e}")`

### Frontend

**Error handling:**
- Use try/catch with error boundaries where appropriate
- Console logging: `console.error(err)`
- Type annotation for caught errors: `catch (err: unknown)`

## Comments

### Python

**Docstrings:** Used for public methods and classes:
```python
async def _get_page(self, url: str) -> str:
    """异步获取页面内容，自动处理验证码挑战，并支持代理重试"""
    ...
```

**Inline comments:** Chinese comments for complex logic:
```python
# 中文数字映射表，用于按季匹配（最多到第十五季）
_CHINESE_NUMBERS = (...)
```

### Frontend

**Minimal comments:** Code is self-explanatory in most cases
**Chinese UI labels:** Used in navigation and UI text

## Function Design

### Python

**Size:** Functions tend to be medium-sized (20-50 lines for complex logic)
**Parameters:** Use type hints for all parameters
**Return values:** Annotated return types, often `Optional[T]`, `List[T]`, or `dict`

**Example from `app/core/scraper.py`:**
```python
async def _get_page(self, url: str) -> str:
    """Async method that handles page fetching with captcha bypass"""
    try:
        response = await self.client.get(url)
        ...
```

### Frontend

**Hooks:** Custom hooks follow `use*` naming pattern
**Components:** Functional components with TypeScript interfaces for props

## Module Design

### Python Backend

**Exports:** Use explicit imports at module level
**Barrel files:** `app/api/__init__.py` imports routers
**Service classes:** Use `@staticmethod` for stateless operations

### Frontend

**Exports:** Named exports for components and hooks
**Barrel pattern:** Not heavily used; imports use relative paths

---

*Convention analysis: 2026-03-12*
