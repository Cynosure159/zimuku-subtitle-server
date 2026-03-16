---
phase: 4
slug: zi-mu-xia-zai-ding-wei-yi-dong
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest |
| **Config file** | None (defaults) |
| **Quick run command** | `pytest tests/test_tasks_api.py -x` |
| **Full suite command** | `pytest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_tasks_api.py -x`
- **After every plan wave:** Run `pytest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | DOWN-03 | unit | `pytest tests/test_tasks_api.py::test_create_task_with_target_path` | ✅ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | DOWN-04 | unit | `pytest tests/test_tasks_api.py::test_create_task_with_season_episode` | ✅ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | DOWN-01 | unit | N/A (frontend) | N/A | ⬜ pending |
| 4-02-02 | 02 | 2 | DOWN-02 | unit | N/A (frontend) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_tasks_api.py` — Add test for target_path parameter
- [ ] `tests/test_tasks_api.py` — Add test for season/episode parameters
- [ ] `tests/test_tasks_api.py` — Add test for file move logic
- [ ] Framework install: Already available (see CLAUDE.md)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search results display format/fps/language | DOWN-01 | Frontend component | Verify SearchResultCard shows all fields |
| Hover shows download button | DOWN-02 | Frontend interaction | Mouse hover on card shows download button |
| Modal style matches spec | DOWN-03 | UI styling | Verify white background, gray border, no blur |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
