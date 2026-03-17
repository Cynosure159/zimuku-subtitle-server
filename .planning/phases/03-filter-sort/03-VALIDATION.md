---
phase: 03
slug: filter-sort
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (Python backend) |
| **Config file** | pytest.ini (if exists) |
| **Quick run command** | `pytest tests/ -x` |
| **Full suite command** | `pytest tests/` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -x` (backend tests)
- **After every plan wave:** Run `pytest tests/` (full suite)
- **Before `/gsd:verify-work:`** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FS-01 | frontend | Manual verification | ⬜ pending |
| 03-01-02 | 01 | 1 | FS-02 | frontend | Manual verification | ⬜ pending |
| 03-01-03 | 01 | 1 | FS-03 | frontend | Manual verification | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- None — This is frontend-only phase, no backend tests needed

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Filter dropdown shows All/Has/Missing options | FS-01 | Frontend UI | Open MoviesPage, verify dropdown appears with 3 options |
| Sort dropdown shows Name/Year/Time/Status | FS-02 | Frontend UI | Open MoviesPage, verify sort dropdown with 4 options |
| Filtered results show correct items | FS-01 | Frontend logic | Select "Has subtitles", verify only items with subtitles show |
| Sorted results are correct order | FS-02 | Frontend logic | Select each sort option, verify correct ordering |
| Empty state shows clear filter button | FS-03 | Frontend UI | Filter to show no results, verify clear button appears |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
