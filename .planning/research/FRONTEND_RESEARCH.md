# Technology Stack

**Project:** Zimuku Subtitle Server - Frontend Architecture Research
**Analysis Date:** 2026-03-13
**Confidence:** MEDIUM - Based on established React patterns and current stack compatibility

## Current Stack Analysis

### Existing Technologies
| Technology | Version | Purpose | Assessment |
|-----------|---------|---------|------------|
| React | 19.2.0 | UI Framework | Current - Uses React 19 hooks (use, useEffect, useMemo) |
| TypeScript | 5.9.3 | Type Safety | Current |
| Vite | 7.3.1 | Build Tool | Current |
| Tailwind CSS | 4.2.1 | Styling | Current - Uses v4 patterns |
| react-router-dom | 7.13.1 | Routing | Current |
| axios | 1.13.6 | HTTP Client | Legacy - Consider TanStack Query |

### Current Architecture Patterns

**Strengths:**
- Component-based organization (pages/, components/)
- Custom hooks for data fetching (useMediaPolling)
- TypeScript interfaces for API responses
- Tailwind CSS for styling

**Improvement Areas:**
- No centralized state management
- Direct API calls in components
- Manual polling with setTimeout
- No error boundaries
- No standardized loading/error states

---

# Recommended Stack Additions

## Core Additions

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| @tanstack/react-query | ^5.60.0 | Server state management | All API data fetching |
| @tanstack/react-query-devtools | ^5.60.0 | Debugging | Development only |
| zustand | ^5.0.0 | Client state | Global UI state (theme, sidebar) |
| react-error-boundary | ^4.1.0 | Error handling | All page components |

## Alternative Considerations

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Server State | TanStack Query | SWR, Redux Toolkit | Better devtools, suspense support, React 19 native |
| Client State | Zustand | Redux Toolkit, Jotai | Simpler API, no provider wrapping, TypeScript-first |
| HTTP Client | Axios (keep) | Fetch API | Interceptors, request/response transformation |

---

# Installation

```bash
cd frontend

# Core additions
npm install @tanstack/react-query@^5.60.0 zustand@^5.0.0 react-error-boundary@^4.1.0

# Dev tools
npm install -D @tanstack/react-query-devtools@^5.60.0
```

---

# Migration Strategy

## Phase 1: Data Layer (TanStack Query)

Replace manual polling with TanStack Query:

```typescript
// Before: useMediaPolling.ts
export function useMediaPolling(type: 'movie' | 'tv') {
  const [files, setFiles] = useState<ScannedFile[]>([]);
  // ... manual polling logic
}

// After: useMedia.ts
import { useQuery } from '@tanstack/react-query';
import { listScannedFiles, getMediaStatus, listMediaPaths } from '../api';

export function useMediaFiles(type: 'movie' | 'tv') {
  return useQuery({
    queryKey: ['media', 'files', type],
    queryFn: () => listScannedFiles(type),
    refetchInterval: (query) => {
      const status = query.state.data;
      // Dynamic polling based on activity
      return status?.is_scanning ? 2000 : false;
    },
  });
}
```

## Phase 2: Client State (Zustand)

For UI state that doesn't come from API:

```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
```

## Phase 3: Error Boundaries

Wrap pages with error boundaries:

```typescript
// App.tsx
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

---

# Sources

- TanStack Query v5 Documentation: https://tanstack.com/query/latest
- Zustand GitHub: https://github.com/pmndrs/zustand
- React Error Boundary: https://github.com/bvaughn/react-error-boundary
- React 19 Documentation: https://react.dev
- Tailwind CSS v4: https://tailwindcss.com

---

*Analysis date: 2026-03-13*
