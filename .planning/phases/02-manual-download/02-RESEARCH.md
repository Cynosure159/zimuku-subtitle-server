# Phase 2: Manual Download Flow - Research

**Researched:** 2026-03-13
**Domain:** Frontend UI Enhancement + Backend Data Structure Enhancement
**Confidence:** HIGH

## Summary

This phase implements enhanced subtitle search results with expandable details, a modal for language/format selection, and custom download path selection. The research identifies that the backend `SubtitleResult` class needs extension to include `format` and `fps` fields, while the frontend requires new components for expandable rows and modal dialogs. The existing TanStack Query and Zustand infrastructure from Phase 1 can be leveraged for state management.

**Primary recommendation:** Extend the backend `SubtitleResult` to include format/FPS data, then build the frontend with a reusable `ExpandableRow` component and modal-based selection flow. Use Zustand for storing the last-used download path.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 展示方式: 行内展开 (inline expand)
- 展开内容: 格式/FPS/语言 + 来源信息 (author, download_count)
- 展开行为: 平滑动画过渡，支持手风琴模式（展开一个其他收起）
- API 需求: 搜索时一并返回所有信息（格式、FPS、语言），无需单独 API

### Claude's Discretion
- Modal component choice (build from scratch or use headless UI library)
- Animation implementation details
- Path selector UI pattern

### Deferred Ideas (OUT OF SCOPE)
- 批量下载 - defer to v2 (ADV-01)
- 网格/列表视图切换 - defer to v2 (ADV-02)
- 下载历史记录 - defer to v2 (ADV-03)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOWN-01 | 搜索结果展示改进 - 显示格式、fps、语言等详细信息 | Backend SubtitleResult extension + frontend display |
| DOWN-02 | 搜索结果可展开 - 点击查看字幕详情 | ExpandableRow component with accordion mode |
| DOWN-03 | 字幕详情弹窗 - 选择语言、格式 | Modal component with selection form |
| DOWN-04 | 下载目标路径选择 - 用户指定保存位置 | Path selector leveraging existing /media/paths API |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI Framework | Project uses React 19 |
| Tailwind CSS | 4.2.1 | Styling + Animations | Project uses Tailwind v4 |
| TanStack Query | 5.90.21 | Data Fetching | From Phase 1 |
| Zustand | 5.0.11 | UI State | From Phase 1 |
| Lucide React | 0.577.0 | Icons | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.90.21 | Search caching | Already installed |
| motion (Framer Motion) | Latest | Complex animations | Only if Tailwind transitions insufficient |

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   ├── SearchResultRow.tsx      # Expandable row component
│   ├── SearchResultDetails.tsx   # Expanded content
│   ├── DownloadModal.tsx        # Modal for language/format selection
│   ├── PathSelector.tsx         # Download path selection
│   └── Modal.tsx                # Reusable modal wrapper
├── hooks/
│   └── useSearchQueries.ts      # Already exists, may need extension
├── stores/
│   └── useUIStore.ts            # Extend with download path memory
└── pages/
    └── SearchPage.tsx           # Modify to use new components
```

### Pattern 1: Expandable Row with Accordion
**What:** Each search result row can be clicked to expand and show additional details (format, fps, author, download count). Clicking one row collapses others (accordion behavior).

**When to use:** When listing search results that need progressive disclosure of information.

**Implementation approach:**
- Use React state to track `expandedIndex` (number or null)
- Conditional rendering with CSS transition for smooth animation
- Use Tailwind's `transition-all` and `max-h` for animation

**Code structure:**
```typescript
interface SearchResult {
  title: string;
  detail_url: string;
  langs?: string[];
  author?: string;
  download_count?: string;
  format?: string;      // NEW: SRT, ASS, etc.
  fps?: string;        // NEW: 24fps, 25fps, etc.
}

function SearchResultRow({
  item,
  isExpanded,
  onToggle
}: {
  item: SearchResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between"
      >
        {/* Title and basic info */}
      </button>

      {/* Expanded content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6">
          {/* Format, FPS, author, download count */}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 2: Modal with Selection Form
**What:** A modal dialog that presents language and format options for the user to select before downloading.

**When to use:** When user needs to make explicit choices before triggering an action.

**Implementation approach:**
- Create a reusable Modal component with backdrop
- Use form controls for selection (radio for single, checkbox for multi)
- Support keyboard navigation and escape to close

### Pattern 3: Path Selector with Memory
**What:** A dropdown/input combination that shows configured media paths and allows custom input.

**When to use:** When user needs to specify a download location.

**Implementation:**
- Fetch paths from `/media/paths` API
- Store last-used path in Zustand
- Allow custom path input with validation

## Backend Changes Required

### Extend SubtitleResult
The current `SubtitleResult` class in `app/core/scraper.py` needs to include:

```python
class SubtitleResult:
    def __init__(
        self,
        title: str,
        link: str,
        lang: List[str],
        rating: str,
        format: Optional[str] = None,      # NEW: SRT, ASS, SSA, SUB, etc.
        fps: Optional[str] = None,         # NEW: 24fps, 25fps, etc.
        author: Optional[str] = None,      # Already parsed
        download_count: Optional[str] = None  # Already parsed
    ):
        self.title = title
        self.link = link
        self.lang = lang
        self.rating = rating
        self.format = format
        self.fps = fps

    def to_dict(self):
        return {
            "title": self.title,
            "link": self.link,
            "lang": self.lang,
            "rating": self.rating,
            "format": self.format,
            "fps": self.fps,
            "author": self.author,
            "download_count": self.download_count,
        }
```

### HTML Parsing Strategy
Zimuku search results page typically shows format and FPS information. The scraper needs to:
1. Parse format from the subtitle entry (often displayed as badge/tag)
2. Extract FPS from the detail row (e.g., "24fps" / "25fps")
3. Return all data in a single search response

**Note:** This requires examining actual Zimuku HTML structure to confirm data availability. The scraper may need to fetch detail page or enhance search page parsing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialog | Build from scratch every time | Reusable Modal component | Consistency, accessibility |
| Animation library | Install Framer Motion | Tailwind CSS transitions | Sufficient for simple expand/collapse |
| State management for download path | Create new store | Extend existing Zustand useUIStore | Single source of UI state |

## Common Pitfalls

### Pitfall 1: Missing Format/FPS Data from Zimuku
**What goes wrong:** Backend returns null values for format/fps because Zimuku doesn't display this in search results.

**Why it happens:** Zimuku may only show format/FPS on the detail page, not in search results.

**How to avoid:** Plan to fetch detail page during search (parallel requests), or fall back to detail page fetch when user expands a row.

**Warning signs:** Backend logs show empty format/fps fields.

### Pitfall 2: Animation Jank
**What goes wrong:** Expand animation is jerky or causes layout shifts.

**Why it happens:** Using `height: auto` doesn't animate; using fixed height limits content.

**How to avoid:** Use `max-height` transition pattern or `grid-template-rows` animation.

### Pitfall 3: Modal Focus Trap Missing
**What goes wrong:** Tab key escapes modal and focuses elements behind it.

**Why it happens:** No focus management implementation.

**How to avoid:** Use native `<dialog>` element or implement focus trap.

## Code Examples

### Expandable Row with Tailwind CSS
```tsx
// Source: Tailwind CSS v4 + React 19 patterns
// Based on standard accordion implementation

function ExpandableRow({
  children,
  isExpanded,
  onToggle
}: {
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        {children}
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6">
            {/* Expanded content */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Simple Modal Component
```tsx
// Source: Built on React 19 + Tailwind CSS patterns

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Path Selector with Memory
```tsx
// Source: Based on existing MediaConfigPanel pattern

import { useState, useEffect } from 'react';
import { listMediaPaths } from '../api';
import { useUIStore } from '../stores/useUIStore';

interface PathSelectorProps {
  onSelect: (path: string) => void;
}

export function PathSelector({ onSelect }: PathSelectorProps) {
  const [paths, setPaths] = useState<MediaPath[]>([]);
  const [customPath, setCustomPath] = useState('');
  const lastUsedPath = useUIStore((state) => state.lastDownloadPath);

  useEffect(() => {
    listMediaPaths().then(setPaths);
  }, []);

  const handleSelect = (path: string) => {
    useUIStore.getState().setLastDownloadPath(path);
    onSelect(path);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Saved paths */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">选择目录</label>
        {paths.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.path)}
            className={`p-3 rounded-lg text-left border transition-colors ${
              p.path === lastUsedPath
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {p.path}
          </button>
        ))}
      </div>

      {/* Custom path input */}
      <div>
        <label className="text-sm font-medium text-slate-700">或输入自定义路径</label>
        <input
          type="text"
          value={customPath}
          onChange={(e) => setCustomPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSelect(customPath)}
          placeholder="/custom/path"
          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
        />
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple list display | Expandable rows with accordion | DOWN-02 | Better information density |
| Direct download button | Modal with selection | DOWN-03 | User control over format |
| Default download path | User-specified path | DOWN-04 | Flexibility for file organization |

**Deprecated/outdated:**
- Basic search results without format/FPS: Replaced by enriched search results

## Open Questions

1. **Does Zimuku provide format/FPS in search results?**
   - What we know: SubtitleResult currently doesn't have these fields
   - What's unclear: Whether Zimuku search page HTML includes this data
   - Recommendation: Inspect actual Zimuku HTML or test with sample searches

2. **Should we fetch detail pages during search or on expand?**
   - What we know: User decision states "search时一并返回所有信息"
   - What's unclear: Performance impact of fetching all detail pages
   - Recommendation: Start with parallel detail page fetches, optimize if too slow

3. **How to handle multiple format/language options per subtitle?**
   - What we know: Current data structure assumes single format/language
   - What's unclear: Whether one subtitle entry can have multiple variants
   - Recommendation: Design for multi-option support from start

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python) + Vitest (Frontend) |
| Config file | pytest.ini exists, vitest.config.ts not detected |
| Quick run command | `pytest tests/` (backend), `npm run test` (frontend - not configured) |
| Full suite command | `pytest` + `npm run build` |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| DOWN-01 | Display format/FPS in search results | Integration | Manual browser verification | N/A |
| DOWN-02 | Expandable rows work with accordion | Component | `npm run build` + manual test | N/A |
| DOWN-03 | Modal selection works correctly | Component | `npm run build` + manual test | N/A |
| DOWN-04 | Path selection saves to Zustand | Unit | Add unit tests | Tests directory exists |

### Wave 0 Gaps
- No existing frontend tests in project
- Consider adding simple component tests for new SearchResultRow and Modal components

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: SearchPage.tsx, scraper.py, search_service.py
- Project dependencies: package.json (React 19, Tailwind 4, TanStack Query 5, Zustand 5)

### Secondary (MEDIUM confidence)
- React 19 + Tailwind CSS patterns (established patterns)
- Existing MediaConfigPanel implementation for path input pattern

### Tertiary (LOW confidence)
- Zimuku HTML structure - requires verification with actual scrape

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies confirmed in package.json
- Architecture: HIGH - Based on existing codebase patterns
- Pitfalls: MEDIUM - Some uncertainty about Zimuku data availability

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days for stable implementation)
