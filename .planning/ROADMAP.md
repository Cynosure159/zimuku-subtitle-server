# Roadmap: Zimuku Subtitle Server

**Created:** 2026-03-13
**Granularity:** Coarse
**Coverage:** 13/13 v1 requirements

## Phases

- [x] **Phase 1: Foundation & UI Enhancement** - Metadata extraction, data layer, UI polish (completed 2026-03-12)
- [ ] **Phase 2: Manual Download Flow** - Search results, details modal, path selection

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

**Plans:** 3/3

**Plan List:**
- [x] 02-01-PLAN.md — Backend Enhancement (extend SubtitleResult with format/fps)
- [ ] 02-02-PLAN.md — Frontend Expandable Results (expandable rows with accordion)
- [ ] 02-03-PLAN.md — Modal & Path Selection (download modal with language/format/path)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & UI Enhancement | 3/3 | Complete   | 2026-03-12 |
| 2. Manual Download Flow | 1/3 | In progress | - |

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
| DOWN-01 | Phase 2 | In Progress |
| DOWN-02 | Phase 2 | Pending |
| DOWN-03 | Phase 2 | Pending |
| DOWN-04 | Phase 2 | Pending |

---

*Generated: 2026-03-13*
*Updated: 2026-03-13 (plans created)*
