---
phase: 04-zi-mu-xia-zai-ding-wei-yi-dong
plan: 03
subsystem: api
tags: [download, task-service, file-move, backend]

# Dependency graph
requires:
  - phase: 04-zi-mu-xia-zai-ding-wei-yi-dong
    provides: DownloadModal with MediaSelector, Modal restyle
provides:
  - Extended SubtitleTask model with target fields
  - Updated tasks API endpoint accepting target parameters
  - File move logic after download completes
affects: [download, task-service]

# Tech tracking
tech-stack:
  added: []
  patterns: [file-move-after-download, language-tag-in-filename, backup-on-failure]

key-files:
  created: []
  modified:
    - app/db/models.py - SubtitleTask with target_path, target_type, season, episode, language
    - app/api/tasks.py - create_download_task accepts target parameters
    - app/services/task_service.py - create_task saves target info, run_download_task moves file
    - frontend/src/api.ts - createDownloadTask accepts target parameters

key-decisions:
  - "Target path parameters added to enable two-level target selection"

patterns-established:
  - "File move after download: shutil.move to target directory"
  - "Language tag in filename: video_filename.{language}.ext"
  - "Backup retention on failure: file stays in download directory"

requirements-completed: [DOWN-04]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 4 Plan 3: Download Target Path and Move Logic Summary

**Extended download task API with target path parameters and implemented file move logic after download completes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T16:31:46Z
- **Completed:** 2026-03-15T16:36:00Z
- **Tasks:** 5
- **Files modified:** 4

## Accomplishments
- Extended SubtitleTask model with target_path, target_type, season, episode, language fields
- Updated tasks API to accept new target parameters
- Implemented file move logic in TaskService.run_download_task: moves file to target directory after download, renames to include language tag
- On move failure, file stays in download directory as backup

## Task Commits

All tasks committed together:

1. **All tasks (1-5): Extend download task with target path and move logic** - `f2dfdff` (feat)

## Files Created/Modified
- `app/db/models.py` - Added target fields to SubtitleTask model
- `app/api/tasks.py` - Updated create_download_task with target parameters
- `app/services/task_service.py` - Updated create_task and added move logic in run_download_task
- `frontend/src/api.ts` - Updated createDownloadTask with target parameters

## Decisions Made
- Target path parameters enable two-level target selection (movie/series selection)
- File move happens immediately after successful download
- Language tag added to filename for easy identification
- On failure, file kept in download directory as backup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Download target path and move logic complete
- Ready for Phase 4 final plan execution

---
*Phase: 04-zi-mu-xia-zai-ding-wei-yi-dong*
*Completed: 2026-03-15*
