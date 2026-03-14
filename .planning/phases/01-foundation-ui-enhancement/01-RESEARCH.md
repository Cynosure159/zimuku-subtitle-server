# Phase 1: Foundation & UI Enhancement - Research

**Researched:** 2026-03-13
**Domain:** Frontend UI enhancement, React state management, metadata extraction
**Confidence:** HIGH

## Summary

This phase involves implementing UI visual improvements, adding metadata extraction (NFO/posters/TXT), and modernizing the data layer with TanStack Query and Zustand. The current codebase uses manual polling with useState for all state management. The key changes needed are: (1) Replace useMediaPolling with TanStack Query for API data fetching, (2) Add Zustand for UI state (sidebar, theme), (3) Implement NFO file parsing on the backend to extract movie metadata, (4) Add poster image handling, (5) Improve UI with modern Tailwind patterns, transitions, and responsive design.

**Primary recommendation:** Use TanStack Query v5 with React 19, Zustand v5 for UI state, implement backend NFO parsing using Python's xml.etree.ElementTree, and enhance frontend with Tailwind v4 patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use TanStack Query for all API calls with automatic caching
- Cache duration: 5 minutes with stale-while-revalidate
- Background refetch on window focus and network reconnect
- Loading states: Skeleton placeholders matching component shapes
- Error handling: Toast notifications with retry option
- Optimistic updates for mutations
- Infinite query for pagination/prefetching on scroll

### Claude's Discretion
- Visual Style: Colors, typography, spacing, card shadows (follow modern Tailwind patterns)
- Metadata Display: Poster image sources, fallback hierarchy, card layout
- Responsive Layout: Breakpoints, mobile navigation, sidebar behavior

### Deferred Ideas (OUT OF SCOPE)
- Visual Style — deferred to planner
- Metadata Display — deferred to planner
- Responsive Layout — deferred to planner
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Frontend visual improvements - colors, spacing, typography | Tailwind v4 CSS-first config, modern utility patterns |
| UI-02 | Interactive improvements - transitions, hover effects | Tailwind v4 transition utilities, motion patterns |
| UI-03 | Responsive design - adapt to different screen sizes | Tailwind v4 breakpoints, mobile-first approach |
| META-01 | Parse NFO files for video metadata (title, year, plot, rating) | Python xml.etree.ElementTree for XBMC/Kodi NFO |
| META-02 | Get poster images from local folder (folder.jpg, poster.jpg, same-name poster) | Python os/pathlib for local file detection |
| META-03 | Parse TXT file for video info as fallback | Simple text file parsing with encoding detection |
| META-04 | Display video poster and info card in frontend | React image handling with fallback hierarchy |
| DATA-01 | Replace manual polling with TanStack Query | @tanstack/react-query v5 with useQuery/useMutation |
| DATA-02 | Add UI state management (Zustand) - sidebar, theme | zustand v5 with create and useStore |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.x | Server state management | Industry standard for React data fetching, automatic caching, background refetch |
| zustand | ^5.x | UI state management | Lightweight, no providers needed, TypeScript-friendly |
| tailwindcss | ^4.2.x | Styling | Already in project, CSS-first config, modern utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.x | Toast notifications | Error handling with retry (per CONTEXT.md requirements) |
| lucide-react | ^0.577.x | Icons | Already in project |

### Installation
```bash
# Install TanStack Query and Zustand
cd frontend && npm install @tanstack/react-query zustand

# Optional: Install toast library
npm install sonner
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/        # UI components
│   ├── MediaInfoCard.tsx
│   ├── MediaSidebar.tsx
│   └── ...
├── hooks/
│   ├── useMediaQueries.ts    # TanStack Query hooks for media API
│   ├── useTaskQueries.ts    # TanStack Query hooks for tasks
│   └── useSearchQueries.ts  # TanStack Query hooks for search
├── stores/
│   └── useUIStore.ts        # Zustand store for UI state
├── lib/
│   └── queryClient.ts       # QueryClient configuration
├── App.tsx                  # Add QueryClientProvider
└── ...
```

### Pattern 1: TanStack Query Data Fetching
**What:** Replace manual polling with TanStack Query for API calls
**When to use:** All API data fetching (media paths, files, tasks, search)
**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/installation
import { useQuery } from '@tanstack/react-query'
import { listMediaPaths, listScannedFiles } from '../api'

// In App.tsx - wrap with QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  }
})

// Custom hook for media data
function useMedia(type: 'movie' | 'tv') {
  return useQuery({
    queryKey: ['media', type],
    queryFn: async () => {
      const [paths, files, status] = await Promise.all([
        listMediaPaths(),
        listScannedFiles(type),
        getMediaStatus()
      ])
      return {
        paths: paths.filter((p: MediaPath) => p.type === type),
        files,
        status
      }
    },
    // Background polling for active tasks (replaces useMediaPolling logic)
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status?.is_scanning || status?.matching_files.length || status?.matching_seasons.length) {
        return 2000 // Poll every 2s when active
      }
      return false // Don't poll when idle
    }
  })
}
```

### Pattern 2: Zustand UI State
**What:** Global UI state without providers
**When to use:** Sidebar state, theme, modals, selections
**Example:**
```typescript
// Source: https://github.com/pmndrs/zustand
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  selectedMediaId: number | null
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedMediaId: (id: number | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  selectedMediaId: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),
}))

// Usage in component
import { useUIStore } from '../stores/useUIStore'

function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  // ...
}
```

### Pattern 3: NFO File Parsing (Backend)
**What:** Parse XBMC/Kodi NFO XML files for movie/TV metadata
**When to use:** Extract metadata from local media folders
**Example:**
```python
# Source: https://docs.python.org/3/library/xml.etree.elementtree.html
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

def parse_nfo(nfo_path: Path) -> dict:
    """Parse NFO file and extract metadata."""
    try:
        tree = ET.parse(nfo_path)
        root = tree.getroot()
    except ET.ParseError:
        return {}

    # Navigate to movie element
    movie = root  # or root.find('movie')

    return {
        'title': movie.findtext('title'),
        'year': movie.findtext('year'),
        'plot': movie.findtext('plot'),
        'rating': movie.findtext('rating'),
        'genres': [g.text for g in movie.findall('genre')],
        'director': movie.findtext('director'),
    }

def find_poster(folder: Path) -> Optional[Path]:
    """Find poster image in media folder."""
    poster_names = ['folder.jpg', 'poster.jpg', 'poster.png', 'folder.png']
    for name in poster_names:
        poster_path = folder / name
        if poster_path.exists():
            return poster_path
    # Also check for same-name poster (e.g., movie.mkv -> movie.jpg)
    return None
```

### Pattern 4: Responsive Layout with Tailwind v4
**What:** Mobile-first responsive design
**When to use:** All page layouts
**Example:**
```html
<!-- Source: https://tailwindcss.com/docs/upgrade-guide -->
<div class="flex flex-col lg:flex-row gap-6">
  <!-- Mobile: stacked, Desktop: side by side -->
  <div class="w-full lg:w-60">Sidebar</div>
  <div class="flex-1">Content</div>
</div>
```

### Anti-Patterns to Avoid
- **Don't use setInterval for polling** - Use TanStack Query's refetchInterval with conditional logic instead
- **Don't use useState for all state** - Use Zustand for global UI state, TanStack Query for server state
- **Don't hardcode colors** - Use Tailwind's semantic color system
- **Don't forget error boundaries** - Use TanStack Query's error handling with toast notifications

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server state caching | Custom caching with useState + localStorage | TanStack Query | Automatic stale-while-revalidate, background refetch, deduping |
| Global UI state | React Context + useReducer | Zustand | Simpler API, no providers, better TypeScript inference |
| Toast notifications | Custom modal implementation | sonner | Accessible, accessible, easy retry button |
| NFO parsing | Custom regex/XML parser | xml.etree.ElementTree | Built-in, handles encoding, XPath support |

**Key insight:** The current useMediaPolling hook manually manages polling with setInterval and useState. TanStack Query provides built-in background polling with stale-time control, automatic deduplication, and better error handling - this is a clear case where hand-rolling causes maintenance burden.

## Common Pitfalls

### Pitfall 1: Query Key Mismatch
**What goes wrong:** Cache not hit because query keys don't match
**Why it happens:** Using different key formats for same data
**How to avoid:** Always use consistent query key structure: `['resource', { filters }]`
**Warning signs:** Multiple API calls for same data, excessive network usage

### Pitfall 2: Zustand Selectors Causing Re-renders
**What goes wrong:** Components re-render on every store change
**Why it happens:** Selecting entire store instead of specific properties
**How to avoid:** Use selectors: `useStore(s => s.property)` not `useStore()`
**Warning signs:** Performance issues, laggy UI on state change

### Pitfall 3: NFO Encoding Issues
**What goes wrong:** Chinese characters display as garbled text
**Why it happens:** NFO files may use different encodings (UTF-8, GBK, GB2312)
**How to avoid:** Try multiple encodings, default to UTF-8
**Warning signs:** ParseError or garbled text in metadata

### Pitfall 4: Tailwind v4 Migration Breaking Changes
**What goes wrong:** Existing classes don't work after upgrade
**Why it happens:** v4 renamed many utilities (bg-opacity -> bg-black/, shadow-sm -> shadow-xs)
**How to avoid:** Run `npx @tailwindcss/upgrade` or manually update classes
**Warning signs:** Visual differences after adding new dependencies

## Code Examples

### Replacing useMediaPolling with TanStack Query
```typescript
// Before: useMediaPolling.ts (manual polling)
const [files, setFiles] = useState([]);
useEffect(() => {
  let timer: ReturnType<typeof setTimeout>;
  const poll = async () => {
    const data = await listScannedFiles(type);
    setFiles(data);
    timer = setTimeout(poll, hasActiveTasks ? 2000 : 10000);
  };
  poll();
  return () => clearTimeout(timer);
}, [type]);

// After: useMediaQueries.ts (TanStack Query)
export function useMediaFiles(type: 'movie' | 'tv') {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['media', 'files', type],
    queryFn: () => listScannedFiles(type),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Background polling for active tasks
  const { data: status } = useQuery({
    queryKey: ['media', 'status'],
    queryFn: getMediaStatus,
    refetchInterval: (query) => {
      const s = query.state.data;
      if (s?.is_scanning || s?.matching_files?.length || s?.matching_seasons?.length) {
        return 2000;
      }
      return false;
    },
  });

  return { files: data || [], status, isLoading, error, refetch };
}
```

### Zustand Store for Sidebar/Theme
```typescript
// stores/uiStore.ts
import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));

// In component - auto-subscribes only to sidebarOpen
function Sidebar() {
  const isOpen = useUIStore((s) => s.sidebarOpen)
  // Only re-renders when sidebarOpen changes
}
```

### Backend Metadata API Endpoint
```python
# app/api/media.py - Add new endpoint
from pathlib import Path

@router.get("/metadata/{file_id}")
async def get_media_metadata(file_id: int, session: Session = Depends(get_session)):
    """Get metadata for a media file (NFO, poster, TXT)"""
    file_record = session.get(ScannedFile, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = Path(file_record.file_path)
    folder = file_path.parent

    metadata = {
        'title': file_record.extracted_title,
        'year': file_record.year,
        'nfo': None,
        'poster_url': None,
        'txt_info': None,
    }

    # Find and parse NFO
    nfo_files = list(folder.glob('*.nfo'))
    if nfo_files:
        metadata['nfo'] = parse_nfo(nfo_files[0])

    # Find poster
    poster = find_poster(folder)
    if poster:
        # Return path for frontend to construct image URL
        metadata['poster_path'] = str(poster)

    # Find TXT info file
    txt_files = list(folder.glob('*.txt'))
    if txt_files:
        metadata['txt_info'] = parse_txt_info(txt_files[0])

    return metadata
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual polling with setInterval | TanStack Query with staleTime | TanStack Query v5 (2024) | Automatic caching, background refetch, deduping |
| React Context for UI state | Zustand | Zustand v4+ | No providers, simpler API, better TypeScript |
| Tailwind v3 config in tailwind.config.js | Tailwind v4 CSS-first config | Tailwind v4 (2024) | No JS config, @theme directive, performance |
| Custom error handling | TanStack Query + sonner toasts | Modern React patterns | Consistent UX, retry built-in |

**Deprecated/outdated:**
- `useMediaPolling` custom hook - replaced by TanStack Query
- `useState` for global UI state - replaced by Zustand
- Tailwind v3 `shadow-sm` utility - renamed to `shadow-xs` in v4
- Tailwind v3 `bg-opacity-*` - replaced by `bg-black/50` syntax in v4

## Open Questions

1. **Poster image serving**
   - What we know: Backend can read local files, need to serve via API
   - What's unclear: Best approach - static file serving or API endpoint with Base64?
   - Recommendation: Use FastAPI static file mounting or dedicated `/media/poster/{path}` endpoint

2. **TXT fallback format**
   - What we know: Need simple text file parsing for basic info
   - What's unclear: Standard format for TXT info files? Common conventions?
   - Recommendation: Support basic key:value format, e.g., `title: Movie Name`

3. **Theme switching**
   - What we know: User mentioned "theme" as potential Zustand use case
   - What's unclear: Is dark mode actually required? What's the theme structure?
   - Recommendation: Implement light/dark toggle, use CSS variables with Tailwind's dark: modifier

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python backend) |
| Config file | pyproject.toml |
| Quick run command | `pytest tests/ -x -q` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| DATA-01 | TanStack Query replaces polling | Unit | `pytest tests/test_api.py -x` | N/A - frontend |
| DATA-02 | Zustand UI state management | Unit | N/A | N/A - frontend |
| META-01 | NFO parsing extracts metadata | Unit | `pytest tests/test_media_scan.py -x -k nfo` | N/A - backend |
| META-02 | Poster image detection | Unit | `pytest tests/test_media_scan.py -x -k poster` | N/A - backend |
| META-03 | TXT fallback parsing | Unit | `pytest tests/test_media_scan.py -x -k txt` | N/A - backend |
| META-04 | Frontend displays metadata | Manual | N/A | N/A |
| UI-01 | Visual improvements | Manual | N/A | N/A |
| UI-02 | Transitions/hover effects | Manual | N/A | N/A |
| UI-03 | Responsive layout | Manual | N/A | N/A |

### Sampling Rate
- **Per task commit:** `pytest tests/test_api.py tests/test_media_scan.py -x -q`
- **Per wave merge:** `pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- None - existing pytest infrastructure covers backend requirements
- Frontend testing (TanStack Query, Zustand) would require adding Vitest/Jest - consider as future enhancement

## Sources

### Primary (HIGH confidence)
- [TanStack Query Installation](https://tanstack.com/query/latest/docs/framework/react/installation) - useQuery/useMutation patterns
- [Zustand GitHub](https://github.com/pmndrs/zustand) - create and useStore API
- [Python xml.etree.ElementTree](https://docs.python.org/3/library/xml.etree.elementtree.html) - NFO parsing
- [Tailwind CSS Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) - v4 breaking changes

### Secondary (MEDIUM confidence)
- [Tailwind v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first configuration details
- Existing project code patterns from CLAUDE.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are established with current documentation
- Architecture: HIGH - Patterns clearly applicable to existing codebase
- Pitfalls: HIGH - Common React/Python issues well-documented

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days for stable stack, libraries change slowly)
