<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Filter UI 控件**
- Use **dropdown menu** for subtitle status filter
- Include 3 options: 全部 (All), 有字幕 (Has), 无字幕 (Missing)
- Show **count** in each option (e.g., "有字幕 (80)")
- Filter applies **immediately** on selection

**排序选项**
- Available sort options: 名称 (A-Z), 年份, 添加时间, 字幕状态
- Default sort: **名称正序 (A-Z)**
- Toggle sort direction by **clicking again** (A-Z → Z-A)

**筛选器位置**
- Controls placed at **top of media list** (not in sidebar)
- Filter and sort arranged **side by side** (left-right split)

**筛选结果为空**
- Show **message + clear filter button** when filter results are empty
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FS-01 | User can filter movies/series by "has subtitles" or "missing subtitles" | ScannedFile.has_subtitle field available; existing grouping logic shows hasSubCount |
| FS-02 | User can sort lists by name, date, or other criteria | ScannedFile has created_at, year, extracted_title fields; existing sort uses localeCompare |
| FS-03 | UI shows filter controls and sorted results | SearchPage provides filter button pattern; MediaSidebar placement confirmed |
</phase_requirements>

# Phase 3: Filter & Sort - Research

**Researched:** 2026-03-17
**Domain:** Frontend filtering and sorting for media library
**Confidence:** HIGH

## Summary

Phase 3 implements filter and sort functionality for the media library (Movies and Series pages). The implementation requires adding dropdown filter controls for subtitle status and sort options at the top of the media list. Existing data structures already support this: `ScannedFile` model has `has_subtitle`, `created_at`, `year`, and `extracted_title` fields. The UI pattern follows the existing SearchPage filter buttons but uses dropdown menus per user requirements.

**Primary recommendation:** Implement filter and sort as a reusable component that wraps MediaSidebar, using useMemo hooks for client-side filtering/sorting similar to existing searchTerm implementation.

## Standard Stack

### Frontend Stack (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project baseline |
| Tailwind CSS | v4 | Styling | Project baseline |
| TypeScript | - | Type safety | Project baseline |
| TanStack Query | - | Data fetching | Already integrated |
| Zustand | - | UI state | Already integrated |
| lucide-react | - | Icons | Already in use |

### No New Dependencies Required

This phase only adds UI components and modifies existing pages. No additional npm packages needed.

## Architecture Patterns

### Recommended Component Structure
```
frontend/src/
├── components/
│   └── MediaFilterBar.tsx   # NEW - Filter dropdown + Sort dropdown
├── pages/
│   ├── MoviesPage.tsx       # MODIFY - Add filter/sort state
│   └── SeriesPage.tsx       # MODIFY - Add filter/sort state
```

### Pattern 1: Filter & Sort Component
**What:** Reusable filter bar with dropdown menus for subtitle status filter and sort criteria
**When to use:** Both MoviesPage and SeriesPage need identical filtering

**Implementation approach:**
```typescript
// Filter state type
type SubtitleFilter = 'all' | 'has' | 'missing';
type SortOption = 'name' | 'year' | 'created' | 'subtitle_status';

// In component
const [filter, setFilter] = useState<SubtitleFilter>('all');
const [sortBy, setSortBy] = useState<SortOption>('name');
const [sortDesc, setSortDesc] = useState(false);

// Counts for dropdown display
const counts = useMemo(() => ({
  all: items.length,
  has: items.filter(i => i.totalCount === i.hasSubCount).length,
  missing: items.filter(i => i.hasSubCount < i.totalCount).length
}), [items]);
```

### Pattern 2: Filtered/Sorted List
**What:** useMemo hooks that apply filter then sort to grouped media
**When to use:** In both MoviesPage and SeriesPage

**Implementation approach:**
```typescript
const filteredAndSortedItems = useMemo(() => {
  // 1. Apply filter
  let result = items;
  if (filter === 'has') {
    result = result.filter(i => i.totalCount === i.hasSubCount);
  } else if (filter === 'missing') {
    result = result.filter(i => i.hasSubCount < i.totalCount);
  }

  // 2. Apply sort
  result.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'name':
        cmp = a.displayTitle.localeCompare(b.displayTitle);
        break;
      case 'year':
        cmp = (a.year || '').localeCompare(b.year || '');
        break;
      case 'created':
        // Would need created_at from ScannedFile
        cmp = 0;
        break;
      case 'subtitle_status':
        cmp = a.hasSubCount / a.totalCount - b.hasSubCount / b.totalCount;
        break;
    }
    return sortDesc ? -cmp : cmp;
  });

  return result;
}, [items, filter, sortBy, sortDesc]);
```

### Existing Patterns to Leverage
- **SearchPage filter buttons** (line 78-91): Button-based filter UI pattern
- **MediaSidebar**: Current list container, filter goes above it
- **useMemo for groupedMovies/Series**: Already handles searchTerm filtering

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filter UI | Custom dropdown from scratch | Native `<select>` or headless UI library | Simple requirements, no need for complex dropdown |
| Sorting logic | Server-side sorting | Client-side useMemo | Small dataset, existing frontend sort pattern |

**Key insight:** The media list is already fully loaded in the frontend. Client-side filtering/sorting is simpler and faster than adding backend API endpoints.

## Common Pitfalls

### Pitfall 1: Filter counts don't update
**What goes wrong:** Dropdown shows stale counts after filter applied
**Why it happens:** Counts calculated from original items, not filtered subset
**How to avoid:** Calculate counts from full dataset before filtering, display all 3 counts regardless of current filter
**Warning signs:** "有字幕 (0)" when it should show non-zero

### Pitfall 2: Sort by "添加时间" not available
**What goes wrong:** ScannedFile has created_at but it's not exposed to frontend
**Why it happens:** API might not return created_at field
**How to avoid:** Verify API returns created_at in the media list response, or sort by file_path modification time as proxy
**Warning signs:** Sort option exists but items don't reorder

### Pitfall 3: Empty state after filter not handled
**What goes wrong:** User sees empty list with no feedback
**Why it happens:** Missing conditional rendering for empty filtered results
**How to avoid:** Add empty state with "没有匹配的媒体" + clear filter button
**Warning signs:** White screen after selecting filter

## Code Examples

### Filter Count Calculation (from existing sidebar items)
```typescript
// In MoviesPage, sidebarItems already has:
// - totalCount: number of files
// - hasSubCount: number of files with subtitles

const filterCounts = useMemo(() => {
  const all = sidebarItems.length;
  const has = sidebarItems.filter(item => item.totalCount > 0 && item.totalCount === item.hasSubCount).length;
  const missing = all - has;
  return { all, has, missing };
}, [sidebarItems]);
```

### Sort Toggle Implementation
```typescript
// Clicking same sort option toggles direction
const handleSortChange = (newSort: SortOption) => {
  if (sortBy === newSort) {
    setSortDesc(!sortDesc); // Toggle direction
  } else {
    setSortBy(newSort);
    setSortDesc(false); // Reset to ascending for new sort
  }
};
```

### Empty State with Clear Filter
```tsx
{filteredItems.length === 0 ? (
  <div className="text-center py-10">
    <p className="text-slate-500 mb-4">筛选结果为空</p>
    <button
      onClick={() => { setFilter('all'); setSearchTerm(''); }}
      className="text-blue-500 hover:underline"
    >
      清除筛选条件
    </button>
  </div>
) : (
  <MediaSidebar items={filteredItems} ... />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Search only filter | Add subtitle status filter | This phase | Users can find missing字幕 media |
| Default sort by title | Configurable sort (name/year/time/status) | This phase | Better library organization |

**Not applicable to this phase:**
- Server-side filtering: Not needed, dataset is small
- Pagination: Already handled by scroll in MediaSidebar

## Open Questions

1. **How to sort by "添加时间"?**
   - What we know: ScannedFile.created_at exists in database model
   - What's unclear: Does API return this field? May need to verify or use file modification time
   - Recommendation: Check /media API response, add created_at if missing

2. **Filter position - above sidebar or config panel?**
   - What we know: CONTEXT.md says "top of media list, not in sidebar"
   - What's unclear: Between MediaConfigPanel and MediaSidebar vs. inside MediaSidebar
   - Recommendation: Place between MediaConfigPanel and MediaSidebar as separate component

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python backend) |
| Config file | pytest.ini (if exists) |
| Quick run command | `pytest tests/ -x` |
| Full suite command | `pytest tests/` |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FS-01 | Filter by subtitle status | Frontend only | Manual verification | No backend |
| FS-02 | Sort by criteria | Frontend only | Manual verification | No backend |
| FS-03 | UI shows controls | Frontend only | Manual verification | No backend |

### Sampling Rate
- **Per task commit:** N/A (frontend only)
- **Per wave merge:** Backend tests still run
- **Phase gate:** Backend tests green before verify-work

### Wave 0 Gaps
- None — This is frontend-only phase, no backend tests needed

## Sources

### Primary (HIGH confidence)
- Project codebase: frontend/src/pages/MoviesPage.tsx, SeriesPage.tsx - current filtering implementation
- Project codebase: app/db/models.py - ScannedFile model fields
- Project codebase: frontend/src/components/MediaSidebar.tsx - existing list component

### Secondary (MEDIUM confidence)
- SearchPage.tsx filter buttons - UI pattern reference

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project stack
- Architecture: HIGH - Leverages existing patterns (useMemo filtering, component structure)
- Pitfalls: MEDIUM - Based on typical React filter/sort issues

**Research date:** 2026-03-17
**Valid until:** 30 days (stable project, no fast-moving changes)
