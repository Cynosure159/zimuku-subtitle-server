# UI/UX Research: Media Management Interface Best Practices

**Project:** Zimuku Subtitle Server
**Researched:** 2026-03-13
**Confidence:** MEDIUM

## Executive Summary

The current Zimuku Subtitle Server UI is functional but basic. Based on established patterns from media servers (Plex, Jellyfin, Emby) and general UI/UX best practices, this document recommends specific improvements for media library management interfaces. The key findings focus on: visual hierarchy through poster-driven layouts, progressive disclosure of information, efficient bulk operations, and real-time status feedback.

## Current UI Assessment

### What's Already Implemented Well

1. **Sidebar navigation** - MediaSidebar provides collapsible list of media items with subtitle coverage indicators
2. **Status visualization** - Color-coded badges (green=matched, red=missing, blue=processing) for quick scanning
3. **Tab-based season navigation** - Clear season selector for TV series
4. **Search with filters** - SearchPage includes language filter chips
5. **Task status icons** - Clear visual status indicators in TasksPage

### Areas Needing Improvement

1. **Missing poster/artwork** - Only placeholder icons shown, no actual thumbnails
2. **Information density** - MediaInfoCard shows minimal metadata
3. **No bulk operations** - Individual file-by-file operations only
4. **Limited search results context** - No preview of subtitle details before download
5. **No progress visualization** - Tasks show status but no progress percentage

---

## Recommended Patterns

### 1. Poster-Driven Visual Hierarchy

**Pattern:** Media libraries universally use poster art as primary navigation element.

**Why it works:**
- Posters provide instant visual recognition (faster than reading titles)
- Enables quick scanning across 50+ items without cognitive overload
- Creates emotional connection to content

**Implementation for Zimuku:**

```tsx
// Recommended sidebar item structure
interface MediaItemCard {
  posterUrl: string;          // Local file or cached
  title: string;
  year?: string;
  subtitleProgress: {         // Visual progress indicator
    matched: number;
    total: number;
  };
  mediaType: 'movie' | 'series';
}
```

**Recommended changes:**
- Replace `MediaSidebar` placeholder with actual poster images from local files or cached artwork
- Add lazy-loading for images to maintain performance
- Implement poster aspect ratio (2:3 for movies, variable for series)
- Add hover state showing quick stats overlay

**Complexity:** Medium - requires image extraction/caching infrastructure

---

### 2. Progressive Disclosure for Information

**Pattern:** Show essential info by default, reveal details on interaction.

**Why it works:**
- Reduces initial cognitive load
- Keeps interface clean while allowing power users to drill down
- Prevents overwhelming users with too much data

**Implementation for Zimuku:**

```tsx
// Three-tier information display
interface FileInfoTier {
  // Tier 1: Always visible (list view)
  filename: string;
  episode?: number;
  subtitleStatus: 'matched' | 'missing' | 'processing';

  // Tier 2: Hover/expand
  subtitleDetails?: {
    language: string;
    author: string;
    downloadCount: number;
    fileSize: string;
  };

  // Tier 3: Click/modal
  actions: ['download', 'match', 'delete', 'history'];
}
```

**Recommended changes:**
- **Tier 1** (default): Show filename + status badge
- **Tier 2** (hover): Show subtitle language, author, file size
- **Tier 3** (click): Open modal with full subtitle details, download history, match confidence score

**Complexity:** Low - primarily UI state management

---

### 3. Bulk Selection & Operations

**Pattern:** Enable multi-select for batch operations on media items.

**Why it works:**
- Users often need to process multiple files (e.g., "download missing subtitles for all episodes")
- Reduces repetitive clicking from 20+ clicks to 2-3
- Essential for large media libraries (100+ items)

**Implementation for Zimuku:**

```tsx
// Bulk operation UX
interface BulkOperationMode {
  isActive: boolean;
  selectedIds: number[];
  availableActions: [
    { id: 'download-missing', label: '批量下载缺失字幕' },
    { id: 'refresh-all', label: '刷新全部状态' },
    { id: 'export-list', label: '导出列表' }
  ];
}
```

**Recommended changes:**
- Add checkbox column to file list (SeriesPage, MoviesPage)
- Implement "Select All" / "Select None" / "Select Missing" quick actions
- Show floating action bar when items selected (similar to email clients)
- Add keyboard shortcuts (Cmd/Ctrl+A, Escape to deselect)

**Complexity:** Medium - requires selection state management and batch API endpoints

---

### 4. Real-Time Progress Visualization

**Pattern:** Show concrete progress metrics, not just status text.

**Why it works:**
- Users need to know how long operations will take
- Progress bars provide reassurance that system is working
- Percentage/count metrics enable better time planning

**Implementation for Zimuku:**

```tsx
// Enhanced task progress
interface TaskProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    current: number;      // e.g., 5
    total: number;        // e.g., 20
    percentage: number;   // e.g., 25
  };
  eta?: {
    seconds: number;
    formatted: '约2分钟';
  };
  currentItem?: string;   // "正在下载: S01E05.srt"
}
```

**Recommended changes:**
- Replace status-only display with progress bars showing X/Y items
- Show current operation detail ("正在搜索: S01E05")
- Display estimated time remaining for batch operations
- Add speed indicator for downloads (e.g., "2.3 MB/s")

**Complexity:** Low - backend provides progress data, frontend visualization

---

### 5. Contextual Search Results

**Pattern:** Show detailed subtitle info before user commits to download.

**Why it works:**
- Users need to verify correct subtitle (language, format, FPS matching)
- Prevents wasted downloads and re-downloads
- Builds trust in automated matching

**Implementation for Zimuku:**

```tsx
// Search result expansion
interface SearchResultExpanded {
  // Always visible
  title: string;
  language: string[];

  // Expandable
  details: {
    format: 'srt' | 'ass' | 'ssa';
    fps: '23.976' | '24' | '25';
    author: string;
    downloadCount: number;
    uploadTime: string;
    matchConfidence: number;   // AI matching score
  };

  // Actions
  preview?: '查看原文';         // Preview subtitle text
  compare?: '对比原文';         // Compare with existing
}
```

**Recommended changes:**
- Add expand/collapse to search result cards
- Show subtitle format, FPS, and match confidence in expanded view
- Add "预览" button to view first few lines of subtitle
- Display comparison with existing subtitle (if any)

**Complexity:** Low - primarily UI state (expand/collapse)

---

### 6. Consistent Visual Feedback

**Pattern:** Use consistent status indicators throughout the application.

**Why it works:**
- Reduces learning curve across pages
- Enables quick scanning without reading labels
- Professional, polished appearance

**Implementation:**

| Status | Color | Icon | Usage |
|--------|-------|------|-------|
| Has Subtitles | Green | CheckCircle | All media lists |
| Missing | Red | AlertCircle | All media lists |
| Processing | Blue | Loader | All lists |
| Queued | Gray | Clock | TasksPage |
| Completed | Green | CheckCircle | TasksPage |
| Failed | Red | XCircle | TasksPage |

**Recommended changes:**
- Standardize status badges across all pages
- Add subtle pulse animation for "processing" states
- Use consistent icon set (lucide-react already in use)
- Add status color legend to main pages

**Complexity:** Low - design system consistency

---

### 7. Responsive Layout for Large Libraries

**Pattern:** Provide grid/list view toggle for different library sizes.

**Why it works:**
- Grid view: Better visual scanning for large libraries (50+ items)
- List view: Better for detailed review and selection
- User preference varies by library size and task

**Recommended changes:**
- Add view toggle in MediaSidebar header (grid/list icons)
- Grid: 3-4 columns of poster cards
- List: Compact row format (current implementation)
- Persist preference in localStorage

**Complexity:** Low - CSS grid/flex layout switch

---

## Anti-Patterns to Avoid

### 1. Showing Too Much Information Initially

**Bad:** Display all metadata (FPS, format, author, download count, comments) in main list view

**Better:** Progressive disclosure (see Pattern 2 above)

### 2. Blocking Operations Without Feedback

**Bad:** Click "Download All Missing" and see nothing until complete

**Better:** Real-time progress with cancel option

### 3. Ignoring Empty States

**Current state:** EmptySelectionState exists but is minimal

**Improvement:** Add helpful illustrations, quick-start guides, or suggested actions in empty states

### 4. Inconsistent Status Colors

**Current issue:** Different shades used across pages

**Fix:** Create centralized status token system in Tailwind config

### 5. No Undo for Destructive Actions

**Current:** Delete task requires confirmation but no undo

**Fix:** Add toast notification with "撤销" option for 5-10 seconds after deletion

---

## Recommended Priority for Implementation

Based on impact and complexity:

| Priority | Feature | Impact | Complexity | Rationale |
|----------|---------|--------|------------|-----------|
| 1 | Progress visualization | High | Low | Immediate usability improvement |
| 2 | Expandable search results | High | Low | Prevents wrong downloads |
| 3 | Bulk selection | High | Medium | Essential for large libraries |
| 4 | Consistent status UI | Medium | Low | Quick polish improvement |
| 5 | View toggle (grid/list) | Medium | Low | User preference flexibility |
| 6 | Poster artwork | High | Medium | Major visual improvement |
| 7 | Progressive disclosure | Medium | Low | Cleaner interface |

---

## Technology Considerations

**Current stack:** React 19 + Tailwind CSS v4 + TypeScript

**Additional libraries to consider:**

| Library | Purpose | When to Use |
|---------|---------|-------------|
| react-virtual | Virtual scrolling | For lists with 100+ items |
| react-hot-toast | Toast notifications | For undo actions, feedback |
| @tanstack/react-query | Data fetching | For caching, background refetch |
| framer-motion | Animations | For polished transitions |

---

## Sources

- Plex Media Server UI patterns (established industry standard)
- Jellyfin/Emby open-source implementations
- Nielsen Norman Group: Progressive Disclosure in UI Design
- Material Design 3: State and Feedback guidelines
- Apple's Human Interface Guidelines: Visual Design Principles

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Patterns | MEDIUM | Based on established media server UIs |
| Implementation | MEDIUM | React/Tailwind well-suited for recommendations |
| Prioritization | HIGH | Based on user workflow analysis |

## Gaps to Address

- **Poster artwork sourcing:** No clear path for where posters come from (local files? external API? user upload?)
- **Offline support:** If no internet, how does UI handle?
- **Accessibility:** Current implementation lacks ARIA labels, keyboard navigation testing needed
