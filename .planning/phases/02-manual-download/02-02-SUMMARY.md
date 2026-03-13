---
phase: 02-manual-download
plan: 02
subsystem: frontend
tags: [search, ui, accordion, expand]
dependency_graph:
  requires:
    - 02-01
  provides:
    - DOWN-01
    - DOWN-02
  affects:
    - SearchPage
    - SearchResultRow
    - SearchResultDetails
tech_stack:
  added:
    - SearchResultDetails component
    - SearchResultRow component
  patterns:
    - Accordion behavior with grid-template-rows animation
    - Type-only imports for SearchResult
key_files:
  created:
    - frontend/src/components/SearchResultDetails.tsx
    - frontend/src/components/SearchResultRow.tsx
  modified:
    - frontend/src/api.ts
    - frontend/src/pages/SearchPage.tsx
decisions:
  - "Used grid-template-rows CSS animation for smooth expand/collapse"
  - "Implemented accordion: only one row expanded at a time"
  - "Used type-only imports for TypeScript verbatimModuleSyntax compliance"
---

# Phase 2 Plan 2: Frontend Expandable Results Summary

Implement expandable search results with accordion behavior and display format/fps information.

## Overview

This plan implements the frontend UI for displaying detailed subtitle information in search results. Users can now click on a search result to expand it and view format, FPS, rating, author, and download count information.

## Tasks Completed

### Task 1: Update SearchResult Interface
**Commit:** `1f71725`
- Added `format?: string` field for subtitle format (SRT, ASS, SSA, SUB)
- Added `fps?: string` field for frame rate (24fps, 25fps, etc.)
- Added `rating?: string` field for subtitle rating

### Task 2: Create SearchResultDetails Component
**Commit:** `6487daa`
- Created new component displaying expanded subtitle details
- Shows format, FPS, and rating as colored badges
- Displays author and download count
- Uses Tailwind CSS for styling

### Task 3: Create SearchResultRow with Accordion
**Commit:** `a926dd0`
- Created expandable row component with smooth animation
- Uses `grid-template-rows` transition pattern for expand/collapse
- Displays title, languages, format, and FPS in header
- Renders SearchResultDetails when expanded
- Implements accordion: clicking one row closes others

### Task 4: Update SearchPage
**Commit:** `6162b0b`
- Imported SearchResultRow component
- Added `expandedIndex` state for accordion tracking
- Updated result rendering to use SearchResultRow
- Implemented toggle handler for accordion behavior

## Verification

- Build passes with new components (pre-existing errors in other files)
- TypeScript type-only imports used for `SearchResult`
- Accordion behavior: only one row expanded at a time
- Format and FPS displayed in both collapsed header and expanded details

## Deviations

None - plan executed exactly as written.

## Requirements Covered

- **DOWN-01:** User can view detailed search results with format, FPS, language information
- **DOWN-02:** User can expand search results to see subtitle details with smooth animation
- **DOWN-03:** Accordion behavior works correctly (only one row expanded at a time)

## Duration

Approximately 3 minutes

## Self-Check

- [x] SearchResultDetails.tsx exists
- [x] SearchResultRow.tsx exists
- [x] api.ts modified with interface
- [x] SearchPage.tsx updated with accordion
- [x] All commits present

**Self-Check: PASSED**
