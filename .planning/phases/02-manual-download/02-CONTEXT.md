# Phase 2: Manual Download Flow - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manually search, browse, and download subtitles with full control. This phase implements enhanced search results display, expandable details, modal for language/format selection, and custom download path selection.

</domain>

<decisions>
## Implementation Decisions

### Search Results Display (DOWN-01, DOWN-02)
- **展示方式**: 行内展开 (inline expand)
- **展开内容**: 格式/FPS/语言 + 来源信息 (author, download_count)
- **展开行为**: 平滑动画过渡，支持手风琴模式（展开一个其他收起）
- **API 需求**: 搜索时一并返回所有信息（格式、FPS、语言），无需单独 API

### Modal for Selection (DOWN-03)
- **选择方式**: 弹窗选择语言和格式
- **弹窗内容**: 语言选项（可多选）、格式选项
- **交互**: 用户选择后确认下载

### Download Path Selection (DOWN-04)
- **路径来源**: 媒体目录（从 MediaPath 配置中获取）
- **用户操作**: 从已有目录中选择，或手动输入自定义路径
- **记忆功能**: 记住上次使用的路径

</decisions>

<specifics>
## Specific Ideas

- "展开行显示详细的格式、FPS、字幕语言信息"
- "平滑的展开/收起动画效果"
- "弹窗内显示语言和格式选择项"
- "从已配置的媒体目录中选择下载目标"

</specifics>

## Existing Code Insights

### Current Implementation
- `SearchPage.tsx`: Basic search with simple results (title, langs, author, download_count)
- `api.ts`: `searchSubtitles(q)` returns basic list
- `scraper.py`: `SubtitleResult` has fields: title, link, lang, rating
- No expand/collapse functionality
- No modal component
- No path selection UI

### Backend Needs Enhancement
- `SubtitleResult` class needs to include: format, fps
- Search service needs to fetch detail page info during search
- Need new endpoint or enhanced `/search/` to return format/FPS

### Reusable Assets
- TanStack Query (from Phase 1)
- Zustand store (from Phase 1)
- Existing MediaPath model for download directory list

### Integration Points
- `SearchPage.tsx` - add expand state management
- Create new Modal component or use existing pattern
- API: `/media/paths` already exists for directory listing

</code_context>

<deferred>
## Deferred Ideas

- 批量下载 - defer to v2 (ADV-01)
- 网格/列表视图切换 - defer to v2 (ADV-02)
- 下载历史记录 - defer to v2 (ADV-03)

</deferred>

---

*Phase: 02-manual-download*
*Context gathered: 2026-03-13*
