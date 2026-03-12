# Codebase Concerns

**Analysis Date:** 2026-03-12

## Tech Debt

### Large Monolithic Files

**File:** `app/core/scraper.py` (553 lines)
- Issue: Exceeds single responsibility principle - handles HTTP client, OCR, parsing, downloading all in one class
- Impact: Difficult to maintain, test, and extend
- Fix approach: Split into separate modules (ZimukuClient, SubtitleParser, DownloadManager)

**File:** `app/services/media_service.py` (329 lines)
- Issue: Contains multiple responsibilities - path management, scanning, auto-matching, season completion
- Fix approach: Extract dedicated services (MediaScanService, AutoMatchService, SeasonCompletionService)

### Database Session Management

**Location:** `app/services/media_service.py:326`
- Issue: `MediaService.run_season_match_process` reuses the same session across async operations with `await asyncio.sleep(2)` between iterations
- Code:
  ```python
  for f in files:
      await MediaService._run_auto_match_internal(f.id, session)  # session reused
      await asyncio.sleep(2)
  ```
- Impact: SQLModel sessions are not designed for concurrent use across async boundaries; could cause connection issues
- Fix approach: Create new session per file or use session-per-operation pattern

### Broad Exception Handling

**Location:** Multiple files (`app/core/scraper.py`, `app/core/utils.py`, `app/core/archive.py`)
- Issue: Uses bare `except Exception:` which masks underlying errors
- Examples:
  - Line 172 in scraper.py: `except Exception as e: logger.warning(...)`
  - Line 45 in utils.py: `except Exception: pass`
  - Lines 39-43 in archive.py: `except Exception:` for encoding fallback
- Impact: Errors are logged but not properly surfaced; debugging is difficult
- Fix approach: Catch specific exceptions and handle each appropriately

## Security Considerations

### No Authentication

**Location:** All API endpoints in `app/api/`
- Risk: All endpoints are publicly accessible with no authentication or authorization
- Current mitigation: None
- Recommendations:
  - Add API key authentication for production deployments
  - Implement JWT-based auth with role-based access control
  - Add rate limiting to prevent abuse

### Weak Path Traversal Protection

**Location:** `app/core/archive.py:47`
- Code: `filename = os.path.basename(filename)` only strips directory components
- Risk: Could still allow files with `../` in the middle to write outside extraction directory
- Current mitigation: Minimal
- Recommendations: Add full path validation after join, reject any path containing `..`

### External Service Exposure

**Location:** `app/mcp/server.py`
- Risk: MCP tools expose search and download functionality without access control
- Impact: Any AI agent with MCP access can trigger downloads
- Recommendations: Add API key validation in MCP tool handlers

## Performance Bottlenecks

### Unbounded Media Library Scans

**Location:** `app/services/media_service.py:103-186`
- Problem: `run_media_scan_and_match` loads all files into memory, iterates without pagination
- Impact: Will degrade severely with large media libraries (10,000+ files)
- Improvement path:
  - Add streaming/chunked processing
  - Implement database-level pagination
  - Add progress tracking for resume capability

### No Request Rate Limiting

**Location:** `app/core/scraper.py`
- Problem: No throttling on requests to zimuku.org
- Impact: Risk of IP ban from target site; no backoff on failures
- Improvement path: Add circuit breaker pattern with exponential backoff

### Inefficient Database Queries

**Location:** `app/services/media_service.py:107-114`
- Problem: Multiple sequential queries for orphan file cleanup
- Code:
  ```python
  all_path_ids = [p.id for p in session_data.exec(select(MediaPath)).all()]
  orphan_files = session_data.exec(select(ScannedFile).where(ScannedFile.path_id.not_in(all_path_ids))).all()
  ```
- Impact: Loads all path IDs into memory; inefficient for large datasets
- Improvement path: Use subquery or batch processing

## Fragile Areas

### HTML Parsing Fragility

**Location:** `app/core/scraper.py`
- Why fragile: Relies on exact CSS class names from zimuku.org (`item prel clearfix`, `subs box clearfix`, etc.)
- Safe modification: If zimuku.org changes HTML structure, all scraping breaks
- Test coverage: Limited - tests mock responses but don't test HTML parsing thoroughly

### OCR Engine Hardcoding

**Location:** `app/core/ocr.py:26-51`
- Why fragile: Hardcoded pixel sample points and digit templates optimized for specific CAPTCHA style
- Impact: CAPTCHA redesign will break entire captcha bypass
- Test coverage: Minimal

### Filename Encoding Guesses

**Location:** `app/core/scraper.py:542-550`, `app/core/archive.py:36-44`
- Code: Tries CP437->GBK, then CP437->UTF-8 fallback
- Why fragile: Assumes specific encoding; will fail for other encodings
- Safe modification: Add encoding detection or use chardet library

## Scaling Limits

### SQLite Database

**Current capacity:** Single-user local use
- Limit: SQLite has write lock limitations; concurrent writes will block
- Scaling path: Migrate to PostgreSQL for multi-user support

### In-Memory Task Status

**Location:** `app/services/media_service.py:21-35`
- Current capacity: Single instance
- Limit: `global_task_status` is process-local; won't work with multiple workers
- Scaling path: Move to Redis or database-backed state

### File System Storage

**Location:** `app/core/config.py:71-78`
- Current capacity: Single server
- Scaling path: Migrate to distributed file storage (S3, etc.)

## Dependencies at Risk

### httpx (HTTP Client)

- Risk: Lock file may not pin exact version; API changes could break
- Impact: Scraping functionality stops working
- Migration plan: Pin to specific version; create abstraction layer for HTTP

### py7zr (7z extraction)

- Risk: Pure Python implementation; may have edge cases
- Impact: Some 7z files fail to extract
- Migration plan: Add error handling fallback; consider pylzma or system 7z binary

### BeautifulSoup (HTML parsing)

- Risk: Depends on html.parser; slower than lxml
- Impact: Slight performance degradation
- Migration plan: Optional - switch to lxml parser

## Missing Critical Features

### Error Recovery

- Problem: No retry mechanism for failed downloads or API calls
- Blocks: Reliable automation in production
- Priority: High

### Logging and Monitoring

- Problem: Basic logging only; no structured logging or metrics
- Blocks: Production observability
- Priority: Medium

### Configuration Validation

- Problem: No schema validation for settings; invalid configs cause runtime errors
- Blocks: Safe deployment
- Priority: Medium

## Test Coverage Gaps

### Auto-Match Process

**Untested:** `app/services/media_service.py:189-305`
- What's not tested: Full auto-match workflow with file download and subtitle extraction
- Risk: Silent failures in production
- Priority: High

### Concurrent Operations

**Untested:** Background task handling with multiple simultaneous scans
- What's not tested: Race conditions, session management under load
- Risk: Data corruption or inconsistent state
- Priority: High

### MCP Server

**Untested:** `app/mcp/server.py:52-107`
- What's not tested: Tool invocation and error handling paths
- Risk: MCP clients receive unexpected errors
- Priority: Medium

### Edge Cases in Scraper

**Untested:**
- Empty search results
- CAPTCHA always fails
- Download links timeout
- File size boundary conditions (exactly 1024 bytes)
- Priority: Medium

---

*Concerns audit: 2026-03-12*
