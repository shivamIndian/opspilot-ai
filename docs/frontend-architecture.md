# OpsPilot AI – Frontend Architecture (Module 16)

## 1. Overview & System Mission

The OpsPilot AI frontend is a enterprise Single Page Application (SPA) built with React 18, TypeScript 5, Vite 6, and Tailwind CSS. It provides a cohesive, responsive, and secure interface for multi-tenant incident management, autonomous AI agent operations, document management, hybrid RAG knowledge search, and governance approvals.

Module 16 establishes the foundational architecture and unified application shell (`AppLayout`), consolidating previously implemented isolated feature modules (Modules 03–15) into an integrated SaaS workspace.

---

## 2. Structural Layering & Directory Layout

The application adheres to a modular, feature-oriented clean frontend architecture:

```
apps/web/src/
├── app/                      # Application-level singletons & configuration
│   ├── AppProviders.tsx      # Unified provider composition tree
│   ├── query-client.ts       # TanStack Query client & cache invalidation rules
│   └── route-config.ts       # Strongly typed route path & metadata registry
├── components/
│   ├── feedback/             # Error boundaries, fallback screens
│   └── ui/                   # Reusable atomic UI library (buttons, inputs, modal, etc.)
├── features/                 # Domain-driven feature modules
│   ├── agent-approvals/      # Human-in-the-loop proposals & review dialogs (Mod 14)
│   ├── agent-memory/         # Memory list, editor, suggestion dialogs (Mod 15)
│   ├── auth/                 # Login, registration, password recovery (Mod 03)
│   ├── documents/            # Multi-format doc uploads & pipeline status (Mod 06-08)
│   ├── knowledge/            # RAG hybrid search & semantic citations (Mod 09-10)
│   ├── organizations/        # Workspaces, member rosters, invitations (Mod 04)
│   └── tickets/              # Ticket queues, detail timelines, triage (Mod 05)
├── hooks/                    # Reusable React hooks (useAuth, useNavigation, etc.)
├── layouts/
│   ├── AppLayout.tsx         # Unified enterprise application shell with sidebar & topbar
│   └── RootLayout.tsx        # Public marketing & authentication layout
├── navigation/               # Navigation configs, sidebar, topbar, breadcrumbs
│   ├── Breadcrumbs.tsx       # Dynamic route-derived navigation trail
│   ├── navigation.config.ts  # Master navigation hierarchy and permission gates
│   ├── OrganizationSwitcher.tsx # Workspace switcher with cache eviction
│   ├── Sidebar.tsx           # Collapsible desktop sidebar & mobile drawer
│   ├── Topbar.tsx            # Sticky header with theme toggle & user menu
│   └── UserProfileMenu.tsx   # User profile, theme switcher, sign out
├── pages/                    # Top-level page wrappers
│   ├── ApprovalsPage.tsx     # Route wrapper for approval inbox
│   ├── DashboardPage.tsx     # Personal dashboard & workspace directory
│   ├── ForbiddenPage.tsx     # Standard 403 access denied view
│   ├── NotFoundPage.tsx      # Standard 404 resource missing view
│   ├── WorkflowsPage.tsx     # LangGraph workflow operational console
│   └── WorkspaceOverviewPage.tsx # Master organization overview & capabilities grid
├── providers/                # React context providers (ThemeProvider, NotificationProvider)
├── routes/                   # Centralized React Router configuration
├── services/                 # Axios HTTP client & tenant-scoped API adapters
├── store/                    # Zustand client stores (auth, organization, app)
├── styles/                   # CSS variable design tokens, globals, component styles
└── types/                    # Domain types and UI contracts
```

---

## 3. Unified Application Shell (`AppLayout`)

All authenticated workspace operations run inside `AppLayout.tsx`, guaranteeing visual consistency and avoiding layout thrashing:

1. **Persistent Collapsible Navigation**:
   - Desktop: 240px (`w-60`) expanded, collapsible to 64px (`w-16`) with persisted state in `localStorage`.
   - Mobile: Slide-over drawer with backdrop overlay and auto-dismissal on navigation.
2. **Dynamic Topbar**:
   - Organization switcher with instant dropdown selection and role badges.
   - Dynamic route-derived breadcrumb trail.
   - Rapid light/dark theme toggle and user profile dropdown.
3. **Resilient Page Scaffolding**:
   - `<Outlet />` wrapped in a localized `<ErrorBoundary>` preventing single-page component failures from terminating the parent navigation session.
   - Synchronizes URL `:organizationId` param with Zustand `useOrganizationStore`.

---

## 4. Architectural Invariants

- **Zero Next.js / Zero Server Components**: SPA architecture exclusively compiled via Vite.
- **Strict In-Memory Token Handling**: Access tokens reside exclusively in memory. No JWT persistence in `localStorage` or `sessionStorage`.
- **Tenant Isolation**: Switching organizations forces complete query cache eviction (`invalidateOrganizationQueries`) preventing cross-tenant data contamination.
