---
phase: quick-series-file-list-style
plan: 1
subsystem: frontend
tags: [ui, styles, series-page]
dependency_graph:
  requires: []
  provides: []
  affects: [SeriesPage.tsx]
tech_stack:
  added: []
  patterns: [Tailwind CSS styling]
---

# Quick Task 004: Series File List Style Optimization

## Summary

优化剧集管理页面文件列表样式，提升视觉效果和用户体验。

## Changes Made

**1. Table Header Style**
- Increased background saturation to `bg-slate-100`
- Updated font weight to `font-semibold`
- Added darker text color for better contrast

**2. File Row Style**
- Added hover background (`hover:bg-slate-50`)
- Improved row spacing (`py-3.5`)
- Enhanced separator border (`border-slate-100`)

**3. Episode Number Badge**
- Changed to circular badge style with `rounded-full`
- Added border and background (`border-slate-200`, `bg-slate-100`)
- Improved text styling

**4. Status Tags**
- Added subtle borders and shadows
- Used softer colors with `border-*-100` and `shadow-sm`
- Added slight padding adjustment

**5. Action Buttons**
- Adjusted sizing and spacing
- Added borders for better visual separation
- Consistent font sizing (`text-xs`)

## Files Modified

- `frontend/src/pages/SeriesPage.tsx` - File list component styling

## Verification

- Lint check passed: `npm run lint -- --fix src/pages/SeriesPage.tsx`

## Commit

`1ced73d` - style(quick-004): optimize series file list styles

## Self-Check: PASSED

- File exists: frontend/src/pages/SeriesPage.tsx
- Commit exists: 1ced73d
- Lint passed
