---
phase: 1
slug: foundation-ui-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (Python backend) / vitest (frontend) |
| **Config file** | pytest.ini (backend), vitest.config.ts (frontend) |
| **Quick run command** | `pytest --tb=short -q` |
| **Full suite command** | `pytest -v && cd frontend && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest --tb=short -q`
- **After every plan wave:** Run `pytest -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DATA-01 | unit | `pytest tests/ -k query -q` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-02 | unit | `pytest tests/ -k store -q` | ✅ | ⬜ pending |
| 1-02-01 | 02 | 1 | META-01 | unit | `pytest tests/ -k nfo -q` | ⬜ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | META-02 | unit | `pytest tests/ -k poster -q` | ⬜ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | META-03 | unit | `pytest tests/ -k txt -q` | ⬜ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | META-04 | e2e | `npm run test` | ⬜ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | UI-01 | visual | manual review | n/a | ⬜ pending |
| 1-03-02 | 03 | 1 | UI-02 | visual | manual review | n/a | ⬜ pending |
| 1-03-03 | 03 | 1 | UI-03 | visual | manual review | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_nfo_parser.py` — stubs for META-01 (NFO parsing)
- [ ] `tests/test_poster_finder.py` — stubs for META-02 (poster detection)
- [ ] `tests/test_txt_parser.py` — stubs for META-03 (TXT fallback)
- [ ] `frontend/tests/` — vitest setup if needed
- [ ] `conftest.py` — shared fixtures for metadata test data

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual aesthetics (colors, spacing, typography) | UI-01 | Subjective design choice | Screenshot comparison or manual review |
| Hover effects and transitions | UI-02 | Animation testing | Manual interaction test |
| Responsive layout at breakpoints | UI-03 | Device多样性 | Resize browser, verify layout adapts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
