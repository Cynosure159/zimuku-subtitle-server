---
phase: quick
plan: 6
type: quick
autonomous: true
must_haves:
  truths:
    - Sidebar width increase applies to both filter bar and media list area
    - Sort preferences persist in localStorage separately for movies and series
    - Missing years sort as 0 (appear first in ascending, last in descending)
  artifacts:
    - path: frontend/src/pages/MoviesPage.tsx
      provides: Sort persistence + width fix + year sorting
    - path: frontend/src/pages/SeriesPage.tsx
      provides: Sort persistence + width fix + year sorting
---

<tasks>

<task type="auto">
  <name>Task 1: Fix MoviesPage list width and add sort persistence</name>
  <files>frontend/src/pages/MoviesPage.tsx</files>
  <action>
1. Fix width: The sidebar container (w-96) should make the MediaSidebar and the filtered list both wider. Currently only the sidebar is wider but the list area (MediaList) remains narrow. Update the layout so both sidebar and content scale with the wider container.

2. Add sort persistence: Use localStorage to persist sortBy and sortDesc separately for movies:
   - Key: 'movies-sort-by' for sortBy
   - Key: 'movies-sort-desc' for sortDesc
   - Load from localStorage on mount
   - Save to localStorage when sort changes

3. Fix year sorting: When sorting by year, treat missing/empty year as 0:
   - Parse year, if empty/null/undefined use 0
   - This ensures missing years appear first in ascending sort
  </action>
  <verify>
    <automated>grep -n "localStorage\|year.*0\|w-96" frontend/src/pages/MoviesPage.tsx | head -10</automated>
  </verify>
  <done>MoviesPage: list width matches sidebar, sort persists in localStorage, missing years sort as 0</done>
</task>

<task type="auto">
  <name>Task 2: Fix SeriesPage list width and add sort persistence</name>
  <files>frontend/src/pages/SeriesPage.tsx</files>
  <action>
1. Fix width: Same as MoviesPage - ensure the content area (MediaList) also uses the wider container

2. Add sort persistence: Use localStorage to persist sortBy and sortDesc separately for series:
   - Key: 'series-sort-by' for sortBy
   - Key: 'series-sort-desc' for sortDesc

3. Fix year sorting: Same logic - treat missing year as 0
  </action>
  <verify>
    <automated>grep -n "localStorage\|year.*0\|w-96" frontend/src/pages/SeriesPage.tsx | head -10</automated>
  </verify>
  <done>SeriesPage: list width matches sidebar, sort persists in localStorage, missing years sort as 0</done>
</task>

</tasks>

<success_criteria>
- Sidebar and content area both use the wider w-96 layout
- Sort preferences persist separately for movies and series in localStorage
- Missing years sort as 0 (appear first in ascending order)
</success_criteria>
