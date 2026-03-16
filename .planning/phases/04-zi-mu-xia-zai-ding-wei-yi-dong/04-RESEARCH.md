# Phase 4: 修复字幕下载定位和移动逻辑 - Research

**Researched:** 2026-03-15
**Domain:** Frontend UI (React 19 + Tailwind CSS v4) + Backend API (FastAPI)
**Confidence:** HIGH

## Summary

This phase focuses on improving the search results display, download modal styling, target directory selection (movies/series lists), and automatic moving/renaming after download. The key changes needed are:

1. **Search Results**: Transform from expandable row to card-based layout with hover-to-show download button
2. **Modal Style**: Remove glassmorphism, use white background with gray border
3. **Target Selection**: Two-level selection (movie/series then season/episode) with media library integration
4. **Backend**: Extend task creation API to accept target_path and implement file move/rename logic

**Primary recommendation:** Implement SearchResultCard component, update DownloadModal with new media selector, extend backend API with target_path support, and add post-download move logic.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **搜索结果展示方式**: 卡片式列表，每行一个卡片
- **信息密度**: 中等 - 标题、格式、语言标签、评分、下载数
- **语言展示**: 标签式 - 用带颜色的小标签显示简体/繁体/英文/双语
- **下载按钮**: 悬停显示 - 鼠标悬停时显示下载按钮，界面更干净
- **弹框风格**: 白底边框 - 白色背景，浅灰色边框，rounded-xl (16px)
- **遮罩层**: 半透明黑色遮罩 (bg-black/50)，不使用毛玻璃
- **选择方式**: 两级选择 - 先选电影/剧集，再选季和集
- **媒体展示**: 文字列表 - 显示标题 + 年份 + 集数信息，点击展开季/集
- **剧集选择**: 季→集 - 先选季，再选该季的具体集数
- **自定义路径**: 高级选项 - 提供"高级选项"展开手动输入路径
- **文件名**: 含语言 - 视频文件名.语言.扩展名 (如 video.简体.ass)
- **移动时机**: 立即移动 - 下载完成后立即移动到目标目录
- **错误处理**: 保留备份 - 移动失败时保留在下载目录，并提示用户

### Claude's Discretion
- 搜索结果卡片的精确布局和间距
- 语言标签的具体颜色方案
- 弹框内的表单组件样式
- 媒体列表的滚动行为
- 后端 API 设计细节

### Deferred Ideas (OUT OF SCOPE)
- 批量下载多个字幕 - 未来版本
- 下载历史记录 - 未来版本
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOWN-01 | 搜索结果展示改进 - 显示格式、fps、语言等详细信息 | Current SearchResultRow already shows langs, format, fps - needs new card layout per locked decisions |
| DOWN-02 | 搜索结果可展开 - 点击查看字幕详情 | Will be replaced with hover-to-show download button per locked decisions |
| DOWN-03 | 字幕详情弹窗 - 选择语言、格式 | Already implemented in DownloadModal, needs restyling |
| DOWN-04 | 下载目标路径选择 - 用户指定保存位置 | Needs enhancement: two-level movie/series selection instead of simple path selection |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Project uses React 19 |
| Tailwind CSS | v4 | Styling | Project uses Tailwind v4 |
| TypeScript | - | Type safety | Project uses TypeScript |
| FastAPI | - | Backend API | Project uses FastAPI |
| SQLModel | - | Database ORM | Project uses SQLModel |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | - | UI state management | For storing last download path |
| TanStack Query | - | Data fetching | For API calls |
| Lucide React | - | Icons | Project already uses it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Card layout | Grid layout | Per locked decision, use card (one per row) |
| Expandable row | Hover for download | Per locked decision, hover shows download button |

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   ├── SearchResultCard.tsx    # NEW: Card-based search result
│   ├── SearchResultRow.tsx     # DEPRECATED: Replace with Card
│   ├── DownloadModal.tsx       # MODIFIED: New style + media selector
│   ├── MediaSelector.tsx       # NEW: Two-level movie/series selector
│   ├── EpisodeSelector.tsx     # NEW: Season → episode selection
│   └── PathSelector.tsx        # MODIFIED: Move to advanced options
├── pages/
│   └── SearchPage.tsx          # MODIFIED: Use Card instead of Row
└── api.ts                      # MODIFIED: Add target_path to createDownloadTask
```

### Pattern 1: Search Result Card Layout
**What:** Card-based search result with hover-to-show download button
**When to use:** When displaying subtitle search results
**Example:**
```tsx
// New component: SearchResultCard.tsx
// Hover state controlled via CSS group-hover or state
<div className="group relative bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-bold text-slate-900">{item.title}</h3>
      <div className="flex gap-2 mt-2">
        {item.langs?.map(lang => (
          <span className={`px-2 py-0.5 rounded text-xs ${
            lang === '简体' ? 'bg-green-100 text-green-700' :
            lang === '繁体' ? 'bg-orange-100 text-orange-700' :
            lang === '英文' ? 'bg-blue-100 text-blue-700' :
            'bg-purple-100 text-purple-700'
          }`}>{lang}</span>
        ))}
      </div>
    </div>
    {/* Download button - shown on hover */}
    <button className="opacity-0 group-hover:opacity-100 transition-opacity ...">
      <Download className="w-5 h-5" />
    </button>
  </div>
</div>
```

### Pattern 2: Two-Level Media Selector
**What:** First select movie/series, then season/episode for TV shows
**When to use:** In DownloadModal when user needs to specify target location
**Example:**
```tsx
// New component: MediaSelector.tsx
// Level 1: Select movie or series
// Level 2: For series, expand to show seasons, then episodes
<div className="flex flex-col gap-2">
  <div className="flex gap-4">
    <button className={type === 'movie' ? 'bg-blue-500' : 'bg-slate-200'}>电影</button>
    <button className={type === 'tv' ? 'bg-blue-500' : 'bg-slate-200'}>剧集</button>
  </div>
  {/* Level 1: List of movies/series */}
  <div className="max-h-60 overflow-y-auto">
    {mediaItems.map(item => (
      <button
        key={item.id}
        onClick={() => item.type === 'tv' ? expandToSeasons(item) : selectAsTarget(item)}
        className="w-full text-left p-2 hover:bg-slate-100 rounded"
      >
        {item.title} ({item.year})
      </button>
    ))}
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Glassmorphism in modal:** Per locked decision, don't use `backdrop-blur-sm`. Use solid `bg-white` with `border border-slate-200`.
- **Expandable rows:** Per locked decision, don't use expandable rows. Use card with hover-to-show download button.
- **Single-level path selection:** Per locked decision, need two-level selection (movie/series then season/episode).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File move after download | Custom implementation | Use `shutil.move()` with error handling | Simple and reliable |
| Language-tagged filename | String concatenation | Format: `{video_name}.{lang}.{ext}` | Per locked decision |
| Media library query | Custom SQL | Use existing MediaService.list_files() | Already implemented |

**Key insight:** The backend already has MediaService for listing scanned files. Use that to populate the media selector.

---

## Common Pitfalls

### Pitfall 1: Modal Backdrop Style
**What goes wrong:** Using glassmorphism (backdrop-blur) instead of solid overlay
**Why it happens:** Current Modal.tsx uses `backdrop-blur-sm`
**How to avoid:** Change to `bg-black/50` without blur per locked decision
**Warning signs:** `backdrop-blur` in Modal component

### Pitfall 2: Search Result Layout
**What goes wrong:** Using expandable rows instead of cards with hover
**Why it happens:** Current SearchResultRow has click-to-expand behavior
**How to avoid:** Create new SearchResultCard component with `group` hover pattern
**Warning signs:** `ChevronDown`/`ChevronUp` icons, `isExpanded` state

### Pitfall 3: Backend Target Path
**What goes wrong:** Not passing target_path to download task
**Why it happens:** Current createDownloadTask only sends title and source_url
**How to avoid:** Extend API to accept target_path, update TaskService to move file after download
**Warning signs:** No target_path parameter in /tasks POST endpoint

### Pitfall 4: File Move Timing
**What goes wrong:** Not moving file immediately after download completes
**Why it happens:** TaskService saves to storage_path but doesn't move to target
**How to avoid:** Add move logic in run_download_task after successful download, with error handling and backup retention
**Warning signs:** Only storage_path used, no target_path field

---

## Code Examples

### Current vs Target: SearchResultCard

**Current (SearchResultRow.tsx):**
```tsx
// Uses click-to-expand pattern
<button onClick={onToggle}>
  {/* Title and tags */}
  {isExpanded ? <ChevronUp /> : <ChevronDown />}
</button>
{isExpanded && (
  <SearchResultDetails item={item} />
  // Download button inside expanded area
)}
```

**Target (SearchResultCard.tsx):**
```tsx
// Uses hover-to-show pattern
<div className="group relative bg-white rounded-xl shadow-sm p-4">
  <div className="flex justify-between">
    <div>{/* Title and tags */}</div>
    {/* Download button - shown on hover */}
    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
      <Download className="w-5 h-5" />
    </button>
  </div>
</div>
```

### Current vs Target: Modal Style

**Current (Modal.tsx line 47):**
```tsx
className="modal-backdrop bg-black/50 backdrop-blur-sm ..."
```

**Target:**
```tsx
className="bg-white border border-slate-200 rounded-xl ..."
// And remove backdrop-blur-sm
```

### Current vs Target: Backend Task Creation

**Current (tasks.py):**
```python
@router.post("/", response_model=SubtitleTask)
async def create_download_task(
    title: str, source_url: str, ...
):
    task = TaskService.create_task(session, title, source_url)
```

**Target:**
```python
@router.post("/", response_model=SubtitleTask)
async def create_download_task(
    title: str, source_url: str,
    target_path: Optional[str] = None,  # NEW
    target_type: Optional[str] = None,    # NEW: movie/tv
    season: Optional[int] = None,        # NEW
    episode: Optional[int] = None,        # NEW
    language: Optional[str] = None,       # NEW: for filename
    ...
):
    task = TaskService.create_task(session, title, source_url, target_path, ...)
```

### File Move Logic (NEW in TaskService)

```python
# After successful download, move to target
if task.target_path:
    video_filename = get_video_filename(task.target_type, task.season, task.episode)
    ext = os.path.splitext(task.filename)[1]
    # Format: video_name.语言.ext
    new_filename = f"{video_filename}.{task.language}{ext}"
    target_full_path = os.path.join(task.target_path, new_filename)
    try:
        if task.save_path and os.path.exists(task.save_path):
            shutil.move(task.save_path, target_full_path)
            task.save_path = target_full_path
    except Exception as e:
        logger.error(f"移动文件失败: {e}")
        task.error_msg = f"下载成功但移动失败: {e}"
        # Keep backup in download directory per locked decision
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Expandable row | Card with hover | This phase | Cleaner UI per user feedback |
| Glassmorphism modal | White border modal | This phase | Consistent with page style |
| Path-only selection | Movie/Series + Season/Episode | This phase | More intuitive target selection |
| No target_path | Extended task API | This phase | Enables automatic file organization |

**Deprecated/outdated:**
- SearchResultRow with expandable behavior: Replaced by SearchResultCard
- backdrop-blur-sm in Modal: Removed per locked decision

---

## Open Questions

1. **How to get video filename for renaming?**
   - What we know: ScannedFile has file_path, can derive video filename
   - What's unclear: Need to match subtitle to video file in same directory
   - Recommendation: Use file_path from ScannedFile to get video filename

2. **Should target_path be stored in SubtitleTask?**
   - What we know: Current SubtitleTask has save_path, filename
   - What's unclear: Add target_path field to model?
   - Recommendation: Add target_path to SubtitleTask for audit trail

3. **How to handle multi-episode selection?**
   - What we know: User wants season → episode selection
   - What's unclear: Can user select multiple episodes at once?
   - Recommendation: Per deferred ideas, batch download is out of scope - implement single episode first

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Config file | None (defaults) |
| Quick run command | `pytest tests/test_tasks_api.py -x` |
| Full suite command | `pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOWN-01 | Search results show format, fps, language | Unit | N/A (frontend) | N/A |
| DOWN-02 | Hover shows download button | Unit | N/A (frontend) | N/A |
| DOWN-03 | Modal with language/format selection | Unit | `pytest tests/test_tasks_api.py::test_create_task_with_target_path` | ✅ |
| DOWN-04 | Two-level target selection | Integration | `pytest tests/test_tasks_api.py` | ✅ |

### Sampling Rate
- **Per task commit:** `pytest tests/test_tasks_api.py -x`
- **Per wave merge:** `pytest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_tasks_api.py` — Add tests for target_path parameter
- [ ] `tests/test_tasks_api.py` — Add tests for file move logic
- [ ] Framework install: Already available (see CLAUDE.md)

---

## Sources

### Primary (HIGH confidence)
- Existing code in: SearchPage.tsx, SearchResultRow.tsx, DownloadModal.tsx, Modal.tsx, PathSelector.tsx
- Backend: tasks.py, task_service.py, media.py, models.py
- Project config: pyproject.toml

### Secondary (MEDIUM confidence)
- User decisions captured in 04-CONTEXT.md (locked decisions from discuss phase)

### Tertiary (LOW confidence)
- Tailwind CSS v4 documentation (project already uses it)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project already uses React 19, Tailwind v4, FastAPI
- Architecture: HIGH - Clear understanding of current components and required changes
- Pitfalls: HIGH - Identified key areas from code review

**Research date:** 2026-03-15
**Valid until:** 30 days (stable phase)
