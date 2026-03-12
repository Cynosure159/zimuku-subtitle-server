# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- Python 3.12 - Backend API, services, scrapers, database models
- TypeScript 5.9 - Frontend React components

**Secondary:**
- JavaScript (ES2022) - Frontend build targets

## Runtime

**Environment:**
- Python 3.12+ - Backend runtime
- Node.js 24+ - Frontend build tools

**Package Manager:**
- pip - Python dependencies (requirements.txt)
- npm - Frontend dependencies (package.json)
- Lockfile: requirements.txt (pip), package-lock.json (npm)

## Frameworks

**Backend:**
- FastAPI 0.1.0 - Web framework for REST API
- SQLModel - Database ORM (built on SQLAlchemy)
- Uvicorn - ASGI server

**Frontend:**
- React 19.2.0 - UI framework
- Vite 7.3.1 - Build tool and dev server
- Tailwind CSS v4.2.1 - Styling framework

**Testing:**
- pytest - Python unit testing
- vitest - Frontend testing (not explicitly configured but common with Vite)

**Code Quality:**
- Ruff - Python linting and formatting
- ESLint 9.39.1 - JavaScript/TypeScript linting

## Key Dependencies

**Backend Core:**
- fastapi - REST API framework
- uvicorn - ASGI server
- httpx - Async HTTP client for scraping
- beautifulsoup4 (bs4) - HTML parsing for web scraping
- lxml - XML/HTML parser
- sqlmodel - SQL database ORM
- python-multipart - Form data parsing
- pyyaml - YAML configuration
- py7zr - 7z archive extraction
- mcp - Model Context Protocol SDK

**Frontend Core:**
- react 19.2.0 - UI library
- react-dom 19.2.0 - React rendering
- react-router-dom 7.13.1 - Client-side routing
- axios 1.13.6 - HTTP client
- lucide-react 0.577.0 - Icon library
- tailwindcss 4.2.1 - CSS framework
- @tailwindcss/vite 4.2.1 - Vite plugin for Tailwind

**Frontend Dev:**
- vite 7.3.1 - Build tool
- @vitejs/plugin-react 5.1.1 - React plugin for Vite
- typescript 5.9.3 - Type checking
- eslint 9.39.1 - Linting

## Configuration

**Environment:**
- Database: SQLite stored in `storage/zimuku.db`
- Configuration stored in database (Setting table)
- Environment variable prefix: `ZIMUKU_` (e.g., ZIMUKU_BASE_URL)
- Default base URL: `https://zimuku.org`
- Proxy: Optional via config/proxy setting

**Build:**
- Backend: pyproject.toml (ruff configuration)
- Frontend: vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js

## Platform Requirements

**Development:**
- Python 3.12+
- Node.js 24+
- npm or yarn

**Production:**
- FastAPI-compatible ASGI server (uvicorn)
- SQLite database (file-based)
- No containerization detected

---

*Stack analysis: 2026-03-12*
