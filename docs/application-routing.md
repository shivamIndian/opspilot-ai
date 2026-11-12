# OpsPilot AI – Application Routing & Navigation Architecture (Module 16)

## 1. Routing Model

OpsPilot AI uses React Router DOM v6 with `createBrowserRouter` declared in `apps/web/src/routes/index.tsx`. The routing model bifurcates into two layout branches:

1. **Public Marketing & Auth Branch (`RootLayout`)**:
   - `/` (Home landing page)
   - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
   - `/invitations/accept`
   - `/403` (Forbidden access denied)
   - `*` (404 Not found)
   - User Account management:
     - `/dashboard` (User workspace directory)
     - `/organizations` (Organization listing)
     - `/organizations/new` (Organization creation)

2. **Authenticated Multi-Tenant Workspace Branch (`AppLayout`)**:
   - Base route: `/organizations/:organizationId`
   - All sub-routes inherit the unified enterprise shell (Sidebar + Topbar):

| Path | Component | Purpose |
| :--- | :--- | :--- |
| `/organizations/:organizationId` | `WorkspaceOverviewPage` | Organization hero, role badge, capability quick-access |
| `.../tickets` | `TicketsPage` | Ticket list, filtering, prioritization |
| `.../tickets/new` | `CreateTicketPage` | New incident dispatch |
| `.../tickets/:ticketId` | `TicketDetailsPage` | Incident timeline, triage notes, resolution |
| `.../documents` | `DocumentsPage` | Document upload, extraction & embedding status |
| `.../knowledge/search` | `KnowledgeSearchPage` | Hybrid vector/keyword RAG search & citations |
| `.../approvals` | `ApprovalsPage` | Human-in-the-loop pending tool action approvals |
| `.../agent/workflows` | `WorkflowsPage` | LangGraph multi-step agent execution console |
| `.../settings/ai-memory` | `MemorySettingsPage` | Persistent agent memories, user facts, semantic search |
| `.../members` | `OrganizationMembersPage` | Team member directory, role updates, member removal |
| `.../invitations` | `OrganizationInvitationsPage` | Invite tokens, status tracking, revoking |
| `.../settings` | `OrganizationSettingsPage` | Workspace branding, slug, description, archival |

---

## 2. Navigation Hierarchy & Role Filtering

The navigation structure is centrally configured in `apps/web/src/navigation/navigation.config.ts`:

- **WORKSPACE Section**: Accessible to all members (`owner`, `admin`, `member`, `viewer`).
  - Overview (`/organizations/:id`)
  - Support Tickets (`/organizations/:id/tickets`)
  - Knowledge Base (`/organizations/:id/knowledge/search`)
  - Documents (`/organizations/:id/documents`)
- **AI OPERATIONS Section**: Accessible to all members.
  - AI Workflows (`/organizations/:id/agent/workflows`)
  - Approval Inbox (`/organizations/:id/approvals`)
  - Agent Memory (`/organizations/:id/settings/ai-memory`)
- **ADMINISTRATION Section**: Filtered by `useNavigation()`. Only visible to `owner` and `admin` roles.
  - Members (`/organizations/:id/members`)
  - Invitations (`/organizations/:id/invitations`)
  - Org Settings (`/organizations/:id/settings`)

---

## 3. Dynamic Breadcrumb System

`apps/web/src/navigation/Breadcrumbs.tsx` automatically resolves the current location pathname and active organization context into a semantic navigation trail:
- Resolves IDs (e.g. orgId to org name).
- Marks current leaf path as `aria-current="page"`.
- Enables single-click upward traversal.
