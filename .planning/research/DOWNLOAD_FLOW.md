# Manual Subtitle Download Flow Research

**Project:** Zimuku Subtitle Server
**Researched:** 2026-03-13
**Overall confidence:** MEDIUM

## Executive Summary

This research analyzes best practices for manual subtitle search and download UX flow. Based on analysis of the existing codebase (SearchPage.tsx, search API, tasks API) and common UI patterns, the recommended flow should include: (1) keyword search with language filters, (2) results display showing subtitle metadata, (3) detailed selection modal for format/quality, (4) destination selection, and (5) progress tracking with error handling.

The current implementation provides basic search and download but lacks detailed selection UI, destination choice, and comprehensive feedback. This research recommends enhancements to make the flow more user-friendly.

## Current Implementation Analysis

### Existing Flow
1. User enters search query on SearchPage
2. API calls SearchService which queries ZimukuAgent
3. Results displayed as list with language tags
4. User clicks download button
5. Task created in background, user sees alert

### Data Model (SubtitleResult)
- `title`: Subtitle name
- `link`: Detail page URL
- `lang`: Language array (e.g., ["简体", "繁体"])
- `rating`: Score/ranking

### Gap Analysis
| Feature | Current | Needed |
|---------|---------|--------|
| Search with filters | Partial (language tabs) | Full |
| Result details | Basic | Enhanced |
| Format selection | None | Yes |
| Quality selection | None | Yes |
| Destination selection | None | Yes |
| Download progress | None | Yes |
| Error feedback | Alert only | Detailed |

## UX Flow Recommendations

### Recommended Flow Diagram

```
[Search Input] → [Search Results] → [Select Subtitle] → [Configure Options] → [Download]
     ↓                ↓                    ↓                  ↓                   ↓
[Language      [Results List      [Detail Modal     [Format/Dest     [Progress Bar]
 Filter]        with metadata]      with options]     Options]          or Error]
```

### Step 1: Search Interface
**Recommendations:**
- Keep existing search bar with Enter key trigger
- Retain language filter tabs (简体/繁体/英文/双语/全部)
- Add search type toggle: Movie / TV Series
- Add season/episode selectors for TV series
- Show result count after search

### Step 2: Results Display
**Recommendations:**
- Display each result as a card with:
  - Title (primary text, bold)
  - Language badges (e.g., "简体", "双语")
  - Rating score (if available)
  - Download count (social proof)
  - Upload date (if available)
- Sort options: Relevance, Rating, Downloads, Date
- Pagination or infinite scroll for large result sets
- Empty state with suggestions when no results

### Step 3: Subtitle Selection (Detail Modal)
**Trigger:** Click on a result card (not download button)

**Modal Content:**
- Full title and description
- Available formats: SRT, ASS, SSA, SUB
- File size estimate
- All available language versions
- Episode number (for series)
- Upload author/creator

### Step 4: Download Configuration
**Options:**
- **Format preference:** Auto-detect from video file or manual select
- **Destination:** Default to video directory or custom path
- **Filename pattern:** Match video or custom

### Step 5: Download Execution
**Feedback:**
- Progress bar or spinner during download
- Status: Downloading → Extracting → Moving → Complete
- Success notification with file location
- Error state with retry option

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| No search results | Show empty state with suggestions (try different keywords) |
| Download fails | Show error with reason, offer retry button |
| Network timeout | Auto-retry once, then show error with manual retry |
| File extraction fails | Show specific error (encoding issue, corrupt archive) |
| Disk space不足 | Show warning before download, prevent if insufficient |
| Duplicate download | Warn if subtitle already exists in destination |

## Comparison with Similar Platforms

| Platform | Search | Filters | Detail View | Progress | Notes |
|----------|--------|---------|-------------|----------|-------|
| Zimuku.org | Yes | Language | Yes | No | Web-based, manual download |
| Shooter.cn | Yes | Format, Language | Yes | Yes | Desktop app |
| OpenSubtitles | Yes | Format, FPS, CD | Yes | Yes | Professional UI |
| This Project (current) | Yes | Language only | No | Alert only | Basic |

## Recommended API Enhancements

### Search API
Add optional parameters:
- `type`: "movie" | "series"
- `sort`: "relevance" | "rating" | "downloads" | "date"

### Results Enhancement
Add to SubtitleResult:
- `format`: string[] (available formats)
- `size`: string (file size estimate)
- `episode`: number (for series)
- `upload_date`: string
- `author`: string

### Download API
Add new endpoint:
- `POST /tasks/with-options`
- Body: `{ source_url, format, destination_path, filename_pattern }`

## Implementation Priority

1. **Phase 1:** Enhance search results display (sort, more metadata)
2. **Phase 2:** Add detail modal with format selection
3. **Phase 3:** Add destination selection and filename options
4. **Phase 4:** Progress tracking and error handling improvements

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Current code analysis | HIGH | Direct codebase inspection |
| UX patterns | MEDIUM | Based on common UI patterns, no external research (web search failed) |
| API recommendations | HIGH | Based on existing service architecture |
| Error handling | MEDIUM | Standard patterns applied |

## Gaps to Address

- Web search for current subtitle UI trends failed (API error)
- Would benefit from user testing to validate recommendations
- Consider adding download history for user reference

## Sources

- Current codebase analysis: SearchPage.tsx, search.py, tasks.py, scraper.py
- Industry patterns: OpenSubtitles, Zimuku, Shooter interfaces
