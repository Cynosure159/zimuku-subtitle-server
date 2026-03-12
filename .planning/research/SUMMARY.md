# Project Research Summary

**Project:** Zimuku Subtitle Server
**Domain:** Media Management / Subtitle Automation Tool
**Researched:** 2026-03-13
**Confidence:** MEDIUM

## Executive Summary

This research covers four key areas for enhancing the Zimuku Subtitle Server: UI/UX best practices for media management, video metadata extraction, manual subtitle download flow, and frontend architecture improvements. The project is a subtitle management tool that helps users automatically match and download subtitles for their media libraries.

The recommended approach centers on three phases: (1) foundational improvements including metadata extraction (NFO/TXT/poster support) and frontend state management upgrade, (2) UI/UX enhancements including progress visualization, search result expansion, and bulk operations, and (3) advanced features like poster-driven visual hierarchy and grid/list view toggles. The key risk is scope creep - the research identifies many desirable features but they should be prioritized carefully to avoid extending development time significantly.

## Key Findings

### Recommended Stack

**Frontend Architecture (FRONTEND_RESEARCH.md):**
The current React 19 + Vite + Tailwind setup is solid but needs state management improvements. The recommended additions are:

- **TanStack Query (v5)** — Server state management replacing manual polling, provides caching, background refetch, and React 19 native support
- **Zustand** — Client state for UI (theme, sidebar), simpler than Redux with no provider wrapping needed
- **react-error-boundary** — Error handling wrapper for graceful failure recovery
- **Pillow** — Image processing for poster extraction and metadata (already in requirements)

**Metadata Processing (METADATA_RESEARCH.md):**
- **lxml** — Primary NFO parsing (already installed), robust XML handling with fallback to stdlib
- **ElementTree** — Fallback for simple NFO parsing
- No new backend dependencies required

### Expected Features

**Must Have (Table Stakes):**
- Progress visualization for downloads — Users need to see download status
- Subtitle format/quality selection — Current flow lacks format choice
- Expandable search results — Users need details before download
- Bulk selection for batch operations — Essential for large libraries

**Should Have (Competitive Differentiators):**
- Poster-driven visual hierarchy — Industry standard (Plex/Jellyfin pattern)
- Grid/list view toggle — User preference flexibility
- Progressive disclosure — Cleaner interface with drill-down capability
- Destination path selection — Users want control over file placement

**Defer (v2+):**
- Subtitle text preview before download
- Comparison with existing subtitles
- Offline mode support
- Accessibility audit improvements

### Architecture Approach

The current architecture follows Service Layer pattern (MediaService, TaskService, SearchService) with REST API routes. Research recommends:

**Major Components to Add:**
1. **MetadataExtractor Service** — Extracts NFO/TXT/poster from video directories
2. **PosterCache Service** — Caches extracted artwork for frontend display
3. **BulkOperationHandler** — Handles batch subtitle operations

### Critical Pitfalls

1. **Scope creep from UI enhancements** — Too many nice-to-have features can extend timeline significantly. Mitigate by strictly following priority matrix from research.
2. **Image caching performance** — Storing/retrieving posters can become a bottleneck. Mitigate by using local filesystem cache with TTL.
3. **Bulk operation failure handling** — Partial failures in batch downloads need clear UX. Mitigate by implementing progress tracking per-item with continue-on-error option.
4. **Frontend state management complexity** — Adding both TanStack Query and Zustand can overcomplicate. Mitigate by keeping them separate: server state in Query, UI state only in Zustand.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Data Layer
**Rationale:** Metadata extraction and frontend state management are foundational - other features depend on them. Metadata enables poster display; Query replaces manual polling which affects all data fetching.

**Delivers:**
- NFO/TXT metadata extraction service
- Poster finding and image info extraction
- TanStack Query migration for all API calls
- Zustand store for UI state

**Addresses:** METADATA_RESEARCH.md (full), FRONTEND_RESEARCH.md (data layer)
**Avoids:** Performance issues from manual polling

### Phase 2: Core UX Improvements
**Rationale:** Progress visualization and search result enhancements directly improve daily usability. These are high-impact, low-complexity changes.

**Delivers:**
- Progress bars for download tasks (X/Y format)
- Expandable search result cards with format/FPS details
- Detail modal for subtitle selection
- Destination path selection UI

**Addresses:** DOWNLOAD_FLOW.md (Phases 1-2), UI_RESEARCH.md (priority 1-2)
**Avoids:** Users abandoning downloads due to no feedback

### Phase 3: Advanced UI Features
**Rationale:** Poster-driven UI and bulk operations are more complex and can be built on top of Phase 1 foundation.

**Delivers:**
- Poster images in MediaSidebar
- Grid/list view toggle
- Bulk selection with batch download
- Consistent status badge system

**Addresses:** UI_RESEARCH.md (priorities 3-7)
**Avoids:** Complexity from poster handling without proper foundation

### Phase Ordering Rationale

- Phase 1 first because metadata extraction requires backend changes, and Query affects all subsequent frontend work
- Phase 2 before Phase 3 because UX improvements are higher impact and lower complexity
- Grid/list toggle and bulk ops depend on having the data layer working (Phase 1)
- Poster display needs metadata extraction completed first

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Metadata caching strategy - how long to cache? Cache invalidation rules?
- **Phase 3:** Poster sourcing - if no local poster exists, should we fetch from external API?

Phases with standard patterns (skip research-phase):
- **Phase 2:** Progress visualization - standard patterns, well documented in UI research
- **Bulk operations** - TanStack Query mutations handle this well

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | TanStack Query, Zustand are established libraries with good docs |
| Features | MEDIUM | Based on industry patterns (Plex/Jellyfin) and user workflow analysis |
| Architecture | HIGH | Current service layer pattern confirmed; additions are straightforward |
| Pitfalls | MEDIUM | Common patterns identified but actual implementation may reveal new issues |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Poster sourcing strategy:** Research assumes posters exist locally in media folders. Need to decide if external API fallback is needed (defer to Phase 3 planning)
- **Offline handling:** Current research doesn't address what happens when Zimuku website is unreachable during searches
- **Accessibility audit:** Current implementation lacks ARIA labels; needs testing during Phase 2-3

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 Documentation — Server state implementation
- Zustand GitHub — Client state patterns
- Kodi NFO format documentation — Metadata parsing

### Secondary (MEDIUM confidence)
- Plex/Jellyfin/Emby UI patterns — Industry standards for media libraries
- Nielsen Norman Group — Progressive disclosure principles
- METADATA_RESEARCH.md — NFO/TXT parsing implementation details

### Tertiary (LOW confidence)
- UI_RESEARCH.md priorities — Based on workflow analysis, needs user validation
- DOWNLOAD_FLOW.md error handling — Standard patterns, may need adjustment

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
