---
phase: 02
slug: manual-download
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x (backend) |
| **Config file** | tests/ (existing) |
| **Quick run command** | `pytest tests/ -x -q` |
| **Full suite command** | `pytest tests/ -v` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -x -q`
- **After every plan wave:** Run `pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DOWN-01 | integration | `pytest tests/test_scraper.py -x -q` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | DOWN-02 | manual | UI test - see instructions | N/A | ⬜ pending |
| 02-03-01 | 03 | 1 | DOWN-03 | manual | UI test - see instructions | N/A | ⬜ pending |
| 02-04-01 | 04 | 1 | DOWN-04 | integration | `pytest tests/test_tasks_api.py -x -q` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_search_api.py` — API tests for enhanced search with format/fps
- Existing test infrastructure covers all phase requirements for backend

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Expandable row animation | DOWN-02 | Visual UI test | Open SearchPage, click expand button, verify smooth animation |
| Modal dialog interaction | DOWN-03 | UI interaction test | Click download, verify modal opens with language/format options |
| Path selector dropdown | DOWN-04 | UI interaction test | Open path selector, verify media directories listed |

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
