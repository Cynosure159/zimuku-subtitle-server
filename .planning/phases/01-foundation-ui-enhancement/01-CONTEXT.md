# Phase 1: Foundation & UI Enhancement - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve visual aesthetics, implement metadata extraction (NFO/posters/TXT), and modernize the data layer with TanStack Query and Zustand. This is the foundation phase that enables the manual download flow in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Data Fetching (TanStack Query)
- Use TanStack Query for all API calls with automatic caching
- Cache duration: 5 minutes with stale-while-revalidate
- Background refetch on window focus and network reconnect
- Loading states: Skeleton placeholders matching component shapes
- Error handling: Toast notifications with retry option
- Optimistic updates for mutations (immediate UI update, rollback on error)
- Infinite query for pagination/prefetching on scroll

### Claude's Discretion
- Visual Style: Colors, typography, spacing, card shadows (follow modern Tailwind patterns)
- Metadata Display: Poster image sources, fallback hierarchy, card layout
- Responsive Layout: Breakpoints, mobile navigation, sidebar behavior

</decisions>

<specifics>
## Specific Ideas

- "Want smooth transitions and hover effects"
- "Skeleton loaders should match the actual component shape"
- "Toast errors should have a retry button"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- useMediaPolling hook: Can be replaced with TanStack Query useQuery
- MediaInfoCard: Has placeholder for poster (gray box with ImageIcon)
- MediaSidebar, MediaConfigPanel: Will benefit from Zustand for shared state

### Established Patterns
- Current: Custom polling hook with setInterval, useState for all state
- Tailwind CSS with slate/blue color scheme
- Components use consistent rounded-xl/rounded-2xl styling

### Integration Points
- Replace useMediaPolling with QueryClientProvider wrapper
- Add Zustand store in App.tsx for sidebar/theme state
- API.ts functions can be wrapped with useQuery/useMutation hooks

</code_context>

<deferred>
## Deferred Ideas

- Visual Style — deferred to planner (user said "you decide")
- Metadata Display — deferred to planner (user said "you decide")
- Responsive Layout — deferred to planner (user said "you decide")

</deferred>

---

*Phase: 01-foundation-ui-enhancement*
*Context gathered: 2026-03-13*
