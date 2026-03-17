# Roadmap: Zimuku Subtitle Server

**Created:** 2026-03-13
**Granularity:** Coarse
**Coverage:** 13/13 v1 requirements

## Phases

- [x] **Phase 1: Foundation & UI Enhancement** - Metadata extraction, data layer, UI polish (completed 2026-03-12)
- [x] **Phase 2: Manual Download Flow** - Search results, details modal, path selection (completed 2026-03-13)
- [x] **Phase 3: Filter & Sort** - List filtering (has/missing subtitles) and sorting (completed 2026-03-15)
- [x] **Phase 4: 字幕下载定位和移动逻辑** - Search results cards, modal styling, media selector, file move (completed 2026-03-15)
- [x] **Phase 5: 后端代码结构优化整理** - 代码结构优化 (pending) (completed 2026-03-15)

---

## Phase Details

### Phase 1: Foundation & UI Enhancement

**Goal:** Users see rich media information with improved visual experience and efficient data fetching

**Depends on:** Nothing (first phase)

**Requirements:** UI-01, UI-02, UI-03, META-01, META-02, META-03, META-04, DATA-01, DATA-02

**Success Criteria** (what must be TRUE):
1. User can view video metadata (title, year, plot, rating) extracted from NFO files
2. User can see poster images extracted from local folder (folder.jpg, poster.jpg)
3. User can view fallback metadata from TXT files when NFO is unavailable
4. User experiences smooth UI with transitions and hover effects
5. User sees responsive layout that adapts to different screen sizes
6. Application uses TanStack Query for efficient server state management
7. Application uses Zustand for UI state (sidebar, theme)

**Plans:** 3/3 plans complete

**Plan List:**
- [x] 01-01-PLAN.md — Data Layer Modernization (TanStack Query, Zustand)
- [x] 01-02-PLAN.md — Backend Metadata Extraction (NFO, poster, TXT)
- [x] 01-03-PLAN.md — Frontend UI Enhancement (poster display, responsive layout)

---

### Phase 2: Manual Download Flow

**Goal:** Users can manually search, browse, and download subtitles with full control

**Depends on:** Phase 1

**Requirements:** DOWN-01, DOWN-02, DOWN-03, DOWN-04

**Success Criteria** (what must be TRUE):
1. User can view detailed search results with format, FPS, language information
2. User can expand search results to see subtitle details
3. User can open modal to select preferred language and format before download
4. User can specify custom download target path for each subtitle

**Plans:** 3/3 plans complete

**Plan List:**
- [x] 02-01-PLAN.md — Backend Enhancement (extend SubtitleResult with format/fps)
- [x] 02-02-PLAN.md — Frontend Expandable Results (expandable rows with accordion)
- [x] 02-03-PLAN.md — Modal & Path Selection (download modal with language/format/path)

---

### Phase 3: Filter & Sort

**Goal:** Users can filter media lists by subtitle status and sort by various criteria

**Depends on:** Phase 2

**Requirements:** FS-01, FS-02, FS-03

**Success Criteria** (what must be TRUE):
1. User can filter movies/series by "has subtitles" or "missing subtitles"
2. User can sort lists by name, date, or other criteria
3. UI shows filter controls and sorted results

**Plans:** 1/1 plans complete

**Plan List:**
- [x] 03-01-PLAN.md — Filter & Sort Implementation

---

### Phase 4: 字幕下载定位和移动逻辑

**Goal:** Users see search results as cards with hover-to-show download, can select target media via two-level selector, and files are automatically moved after download

**Depends on:** Phase 3

**Requirements:** DOWN-01, DOWN-02, DOWN-03, DOWN-04

**Success Criteria** (what must be TRUE):
1. User can see search results as cards with medium information density
2. Download button appears on hover over card
3. Modal uses white background with gray border (no glassmorphism)
4. User can select target via two-level selector (movie/series then season/episode)
5. After download completes, file moves to target directory with language-tagged filename
6. On move failure, file stays in download directory with error message

**Plans:** 3/3 plans executed

**Plan List:**
- [x] 04-01-PLAN.md — Search Result Card Layout (card-based with hover-to-show)
- [x] 04-02-PLAN.md — Modal Styling & Media Selector (white border, two-level selection)
- [x] 04-03-PLAN.md — Backend Task API & File Move (target params, move logic)

---

### Phase 5: 后端代码结构优化整理 (backend-refactor)

**Goal:** 优化后端代码结构，使其更可读、可拓展、可复用，符合代码架构规范，目录层级明确。此重构仅优化代码结构，不改变现有功能行为。

**Depends on:** Phase 4

**Requirements:** REQ-01, REQ-02, REQ-03, REQ-04

**Success Criteria** (what must be TRUE):
1. Core modules organized into subdirectories (scraper/, archive/, ocr/)
2. API layer uses Service layer instead of direct Core calls
3. All imports updated correctly
4. Application starts and all tests pass

**Plans:** 3/3 plans complete

**Plan List:**
- [x] 05-01-PLAN.md — Core Layer Refactoring (scraper/archive/ocr subdirectories)
- [x] 05-02-PLAN.md — Service Layer Enhancement (settings/metadata service creation)
- [ ] 05-03-PLAN.md — Verification & Final Cleanup (import verification, tests)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & UI Enhancement | 3/3 | Complete   | 2026-03-12 |
| 2. Manual Download Flow | 3/3 | Complete   | 2026-03-13 |
| 3. Filter & Sort | 1/1 | Complete   | 2026-03-16 |
| 4. 字幕下载定位和移动逻辑 | 3/3 | Complete   | 2026-03-15 |
| 5. 后端代码结构优化整理 | 3/3 | Complete   | 2026-03-15 |

---

## Coverage Map

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| META-01 | Phase 1 | Complete |
| META-02 | Phase 1 | Complete |
| META-03 | Phase 1 | Complete |
| META-04 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DOWN-01 | Phase 4 | Complete |
| DOWN-02 | Phase 4 | Complete |
| DOWN-03 | Phase 4 | Complete |
| DOWN-04 | Phase 4 | Complete |
| FS-01 | Phase 3 | Complete |
| FS-02 | Phase 3 | Complete |
| FS-03 | Phase 3 | Complete |
| REQ-01 | Phase 5 | Planned |
| REQ-02 | Phase 5 | Planned |
| REQ-03 | Phase 5 | Planned |
| REQ-04 | Phase 5 | Planned |

---

*Generated: 2026-03-13*
*Updated: 2026-03-15 (phase 5 planned)*
