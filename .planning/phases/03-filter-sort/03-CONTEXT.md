# Phase 3: Filter & Sort - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can filter media lists by subtitle status (has/missing) and sort by various criteria. This enables users to quickly find media that needs subtitles or view their library in different orders.

</domain>

<decisions>
## Implementation Decisions

### Filter UI 控件
- Use **dropdown menu** for subtitle status filter
- Include 3 options: 全部 (All), 有字幕 (Has), 无字幕 (Missing)
- Show **count** in each option (e.g., "有字幕 (80)")
- Filter applies **immediately** on selection

### 排序选项
- Available sort options: 名称 (A-Z), 年份, 添加时间, 字幕状态
- Default sort: **名称正序 (A-Z)**
- Toggle sort direction by **clicking again** (A-Z → Z-A)

### 筛选器位置
- Controls placed at **top of media list** (not in sidebar)
- Filter and sort arranged **side by side** (left-right split)

### 筛选结果为空
- Show **message + clear filter button** when filter results are empty

</decisions>

<specifics>
## Specific Ideas

- Dropdown should show counts to help users understand the distribution
- Filter and sort should be clearly separated in the UI
- Clear filter button should be prominent in empty state

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MediaSidebar` component - existing list component that could host filter controls
- `MoviesPage.tsx` - already has searchTerm state and filtering logic
- `SeriesPage.tsx` - similar structure to MoviesPage
- TanStack Query - already integrated for data fetching

### Established Patterns
- Search term filter already exists (filters by title)
- `has_subtitle` field available on ScannedFile objects
- Dropdown UI patterns exist in the codebase (SearchPage language filter)

### Integration Points
- Filter controls should go in MediaConfigPanel or above MediaSidebar
- Filter state needs to be passed to the media list component
- Sort should apply to the `groupedMovies` / `groupedSeries` useMemo results

</code_context>

<deferred>
## Deferred Ideas

None — all discussion stayed within phase scope

</deferred>

---

*Phase: 03-filter-sort*
*Context gathered: 2026-03-17*
