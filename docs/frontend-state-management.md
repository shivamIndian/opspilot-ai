# OpsPilot AI – Frontend State Management & Cache Architecture (Module 16)

## 1. State Management Stratification

OpsPilot AI partitions frontend state into three distinct tiers:

```
┌────────────────────────────────────────────────────────┐
│                   Global Client State                  │
│       (Zustand Stores: useAuthStore, useOrgStore)      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Server & Query Cache                   │
│          (TanStack React Query + QueryClient)          │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                   Local Component State                │
│             (React useState / useReducer)              │
└────────────────────────────────────────────────────────┘
```

---

## 2. Global Stores (`Zustand`)

### `useAuthStore`
- **Responsibilities**: In-memory access token storage, CSRF token handling, current user profile, authentication status.
- **Security Invariant**: Never writes JWT tokens to disk or browser storage. Re-authenticates silently via `initAuth()` on mount using secure HTTP-only refresh cookies.

### `useOrganizationStore`
- **Responsibilities**: Available organizations array, current active organization selection, loading status.
- **Persistence**: Remembers active organization ID in `sessionStorage` (`opspilot_active_org_id`) to maintain state across browser tabs while preventing stale disk persistence.

---

## 3. Server State & Cache Invalidation

Configured in `apps/web/src/app/query-client.ts`:

- **Default Options**:
  - `staleTime`: 15 seconds (prevents aggressive over-fetching while keeping data fresh).
  - `refetchOnWindowFocus`: false (prevents unnecessary background network bursts).
  - `retry`: 1 attempt for idempotent queries.

### Multi-Tenant Cache Invalidation Protocol

When a user switches organizations via `OrganizationSwitcher`:

```ts
export const invalidateOrganizationQueries = (prevOrganizationId: string) => {
  // Evict all queries belonging to previous organization to avoid cross-tenant leaks
  queryClient.removeQueries({
    predicate: query => {
      const key = query.queryKey;
      return key.includes(prevOrganizationId) || key.includes('organization');
    },
  });
};
```

This guarantees that cached tickets, documents, search results, or approval queues from Organization A are purged before Organization B data loads.

---

## 4. UI Context Providers

1. **`ThemeProvider` (`apps/web/src/providers/ThemeProvider.tsx`)**:
   - Manages theme mode (`light`, `dark`, `system`).
   - Persists user selection in `localStorage` (`opspilot_theme`).
   - Listens to OS `matchMedia('(prefers-color-scheme: dark)')` when set to `system`.
2. **`NotificationProvider` (`apps/web/src/providers/NotificationProvider.tsx`)**:
   - Manages toast notification stack.
   - Provides accessible live regions (`role="status"`, `aria-live="polite"`).
   - Auto-dismisses toasts with configurable durations.
