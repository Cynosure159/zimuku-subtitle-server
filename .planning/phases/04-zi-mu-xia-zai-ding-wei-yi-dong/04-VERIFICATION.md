---
phase: 04-zi-mu-xia-zai-ding-wei-yi-dong
verified: 2026-03-15T00:00:00Z
status: gaps_found
score: 4/6 must-haves verified
gaps:
  - truth: "User can select target media and specify season/episode for TV shows"
    status: failed
    reason: "DownloadModal collects target info but does NOT pass to API"
    artifacts:
      - path: "frontend/src/components/DownloadModal.tsx"
        issue: "Line 66 calls createDownloadTask with only (title, url), ignoring target_path, target_type, season, episode, language"
    missing:
      - "Pass targetMedia.path as target_path"
      - "Pass targetMedia.type as target_type"
      - "Pass selectedSeason as season"
      - "Pass selectedEpisode as episode"
      - "Pass selectedLangs[0] as language"
  - truth: "User can select language in download modal"
    status: failed
    reason: "Language selection UI exists but value not passed to API"
    artifacts:
      - path: "frontend/src/components/DownloadModal.tsx"
        issue: "selectedLangs state is managed but never sent to backend"
    missing:
      - "Pass selectedLangs[0] to createDownloadTask"
---

# Phase 4: 字幕下载定位移动 Verification Report

**Phase Goal:** Users see search results as cards with hover-to-show download, can select target media via two-level selector, and files are automatically moved after download
**Verified:** 2026-03-15
**Status:** gaps_found
**Score:** 4/6 must-haves verified

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see search results as cards with medium information density | ✓ VERIFIED | SearchResultCard.tsx renders title, format, fps, rating, download count |
| 2 | User can see download button when hovering over a card | ✓ VERIFIED | Button has `opacity-0 group-hover:opacity-100` classes |
| 3 | Language tags displayed as colored badges | ✓ VERIFIED | languageColors maps 简体/繁体/英文/双语 to green/orange/blue/purple |
| 4 | Modal uses white background with gray border (no glassmorphism) | ✓ VERIFIED | Modal.tsx: bg-white border-slate-200, no backdrop-blur |
| 5 | User can select target media and specify season/episode | ✗ FAILED | DownloadModal collects but DOES NOT PASS to API |
| 6 | User can select language in download modal | ✗ FAILED | selectedLangs managed but not sent to createDownloadTask |

**Score:** 4/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/components/SearchResultCard.tsx` | Card layout, hover download | ✓ VERIFIED | 76 lines, implements all features |
| `frontend/src/components/Modal.tsx` | White bg, gray border | ✓ VERIFIED | 71 lines, no glassmorphism |
| `frontend/src/components/MediaSelector.tsx` | Two-level selection | ✓ VERIFIED | 156 lines, movie/tv tabs, expandable seasons |
| `frontend/src/components/EpisodeSelector.tsx` | Season → episode | ✓ VERIFIED | 70 lines, fetches from API |
| `frontend/src/components/DownloadModal.tsx` | Integrates selectors | ✓ VERIFIED | 229 lines, BUT does NOT pass target params to API |
| `app/db/models.py` | target_path fields | ✓ VERIFIED | Has target_path, target_type, season, episode, language |
| `app/api/tasks.py` | Accepts target params | ✓ VERIFIED | All 5 params accepted in endpoint |
| `app/services/task_service.py` | File move logic | ✓ VERIFIED | Has shutil.move logic at line 191 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| SearchPage.tsx | SearchResultCard.tsx | import | ✓ WIRED | Line 4 imports, line 98 renders |
| DownloadModal.tsx | MediaSelector.tsx | import | ✓ WIRED | Line 4 imports, line 165 renders |
| DownloadModal.tsx | Modal.tsx | className | ✓ WIRED | Uses Modal component |
| tasks.py | task_service.py | TaskService.create_task | ✓ WIRED | target_path passed through |
| **DownloadModal.tsx** | **api.ts** | **createDownloadTask call** | **✗ NOT_WIRED** | **Line 66: only passes title+url, ignores target params** |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DOWN-01 | 04-01 | Search results show format, fps, language | ✓ SATISFIED | SearchResultCard shows all fields |
| DOWN-02 | 04-01 | Hover shows download button | ✓ SATISFIED | group-hover:opacity-100 implemented |
| DOWN-03 | 04-02 | Modal with language/format selection | ⚠️ PARTIAL | UI exists but selections NOT sent to API |
| DOWN-04 | 04-02, 04-03 | Two-level target selection | ✗ BLOCKED | UI works but API never receives target_path |

### Anti-Patterns Found

No stub patterns found. All components are substantive.

### Gaps Summary

**CRITICAL WIRING FAILURE:** The DownloadModal.tsx collects all target information from the user:
- targetMedia (path, type)
- selectedSeason, selectedEpisode
- selectedLangs (language)

BUT line 66 only passes `subtitle.title` and `subtitle.detail_url` to createDownloadTask:
```typescript
await createDownloadTask(subtitle.title, subtitle.detail_url);
```

The API function signature supports target parameters:
```typescript
createDownloadTask(
  title: string,
  source_url: string,
  target_path?: string,        // IGNORED
  target_type?: 'movie' | 'tv', // IGNORED
  season?: number,              // IGNORED
  episode?: number,             // IGNORED
  language?: string             // IGNORED
)
```

**Impact:** DOWN-04 (target path selection) is BLOCKED. Files will always download to default location regardless of user selection.

---

_Verified: 2026-03-15_
_Verifier: Claude (gsd-verifier)_
