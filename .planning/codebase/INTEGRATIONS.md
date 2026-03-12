# External Integrations

**Analysis Date:** 2026-03-12

## APIs & External Services

**Subtitle Source:**
- Zimuku.org (https://zimuku.org) - Primary subtitle search and download source
  - Client: Custom scraper in `app/core/scraper.py` (ZimukuAgent class)
  - Auth: None required (public website)
  - Protocol: HTTP/HTTPS
  - Features: Search, detail pages, download links, captcha handling via OCR

**Proxy Support:**
- Optional HTTP/HTTPS proxy for Zimuku requests
- Configuration: `proxy` key in database settings
- Fallback: Direct connection if proxy fails

## Data Storage

**Databases:**
- SQLite
  - Location: `storage/zimuku.db`
  - ORM: SQLModel
  - Tables: Setting, SearchCache, SubtitleTask, MediaPath, ScannedFile

**File Storage:**
- Local filesystem
  - Subtitle downloads: User-configured media directories
  - Database: `storage/zimuku.db`
  - Temp downloads: `storage/` directory

**Caching:**
- SQLite-based search cache
  - Table: `SearchCache`
  - TTL: Configurable (default 24 hours)
  - Config key: `cache_expiry_hours`

## Authentication & Identity

**Auth Provider:**
- None implemented
- CORS enabled for all origins (`allow_origins=["*"]`)
- No authentication/authorization middleware

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Bugsnag, etc.)

**Logs:**
- Python logging module
- Configurable via LOG_LEVEL environment variable (default: INFO)
- Format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
- Logs written to stdout

## CI/CD & Deployment

**Hosting:**
- Self-hosted (local deployment)
- No cloud platform detected

**CI Pipeline:**
- None detected (no GitHub Actions, GitLab CI, etc.)

## Environment Configuration

**Required env vars:**
- LOG_LEVEL (optional, default: INFO)
- ZIMUKU_* prefixed variables for settings override

**Secrets location:**
- Database (Setting table)
- Environment variables for overrides

## Webhooks & Callbacks

**Incoming:**
- None implemented

**Outgoing:**
- None implemented

## MCP Integration

**Protocol:**
- Model Context Protocol (MCP)
- Implementation: `app/mcp/server.py`
- Entry point: `run_mcp.py`

**Exposed Tools:**
- `search_subtitles` - Search for subtitles
- `download_subtitle` - Download subtitle by URL

**Transport:**
- stdio (standard input/output)

---

*Integration audit: 2026-03-12*
