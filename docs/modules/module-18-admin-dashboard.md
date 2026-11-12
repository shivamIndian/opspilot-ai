# Module 18: OpsPilot AI – Admin Dashboard & Operations Telemetry

## 1. Overview & System Mission

Module 18 implements the enterprise **Admin Dashboard** for OpsPilot AI. Organizations upload internal documents, maintain support operations, invoke autonomous agent workflows, and gate critical business mutations through human approvals.

The Admin Dashboard provides organization owners and administrators with an executive, real-time command center summarizing:
- Support ticket resolution pipelines and priority distributions
- Enterprise knowledge base document processing and vector embedding index status
- Autonomous AI agent workflow executions, success rates, latency, and tool call volume
- Human-in-the-loop pending approval requests and governance audits
- Organization-wide audit trail and recent activity feed

All metrics are computed on-demand using optimized SQL aggregates and internal microservice queries against persistent database state. **No mock numbers, synthetic statistics, or hardcoded metrics are used.**

---

## 2. Architecture & Tenant Boundary Isolation

```
                                      +------------------------------------+
                                      |     React 18 Admin Dashboard       |
                                      | (/organizations/:orgId/dashboard)  |
                                      +-----------------+------------------+
                                                        |
                                                        | Authenticated HTTP (JWT + Tenant ID)
                                                        v
                                      +------------------------------------+
                                      |     Node.js Express API Server     |
                                      |  (app schema authority & gateway)  |
                                      +--------+------------------+--------+
                                               |                  |
                       Direct SQL Aggregates   |                  | Internal Auth S2S Call
                     (Tickets, Docs, Approvals)|                  | (/internal/v1/agent/workflows/...)
                                               v                  v
                               +-------------------+      +-------------------+
                               | PostgreSQL 16 DB  |      | Python AI Service |
                               |   (Schema: app)   |      |  (Schema: ai)     |
                               +-------------------+      +---------+---------+
                                                                    |
                                                                    | Direct Async Session
                                                                    v
                                                          +-------------------+
                                                          | PostgreSQL 16 DB  |
                                                          |   (Schema: ai)    |
                                                          +-------------------+
```

### Security & Privilege Isolation Invariants:
1. **Strict Role Access Control**: Only users with the `owner` or `admin` role in the active organization context are granted the `'dashboard:read'` permission. Standard members requesting dashboard data receive `403 Forbidden`.
2. **Database Boundary Protection**: The Node.js API database user (`opspilot_api`) owns and operates on the `app` schema (`app.tickets`, `app.documents`, `app.agent_action_proposals`, `app.organization_audit_logs`). It cannot and does not query the `ai` schema directly.
3. **Internal AI Microservice Communication**: Agent workflow runs stored in `ai.agent_workflow_runs` are queried via an internal authenticated HTTP endpoint (`GET /internal/v1/agent/workflows/analytics/summary`) secured with the constant-time token validator `verify_internal_service_token`.
4. **Tenant Isolation**: Every SQL query and internal API query enforces explicit `organization_id = $1` parameterization. Cross-tenant leakage is strictly prevented.

---

## 3. Implemented API Endpoints

### 1. `GET /api/v1/organizations/:organizationId/dashboard/overview`
- **Guards**: `requireAuthentication`, `requireOrganizationContext`, `requireOrgPermission('dashboard:read')`
- **Query Parameters**:
  - `period`: `'7d' | '30d' | '90d' | 'custom'` (Default: `'30d'`)
  - `from`: ISO start timestamp (for custom range)
  - `to`: ISO end timestamp (for custom range)
- **Response**:
```json
{
  "success": true,
  "data": {
    "period": { "key": "30d", "fromDate": "2026-10-05T...", "toDate": "2026-11-04T..." },
    "kpis": {
      "openTickets": 12,
      "unassignedTickets": 3,
      "urgentTickets": 2,
      "pendingApprovals": 4,
      "activeDocuments": 18,
      "aiWorkflowsTotal": 85,
      "aiSuccessRate": 97.6,
      "avgWorkflowDurationMs": 1420.5
    },
    "tickets": { ... },
    "documents": { ... },
    "aiActivity": { ... },
    "approvals": { ... },
    "recentActivity": [ ... ]
  }
}
```

### 2. `GET /api/v1/organizations/:organizationId/dashboard/recent-activity`
- **Guards**: `requireAuthentication`, `requireOrganizationContext`, `requireOrgPermission('dashboard:read')`
- **Query Parameters**: `limit` (max 100, default 20), `offset` (default 0)
- **Response**: Paginated audit log records joined with user identities (`actor_name`, `actor_email`).

### 3. `GET /internal/v1/agent/workflows/analytics/summary` (AI Microservice)
- **Guards**: `verify_internal_service_token` (`X-Internal-Service-Token` or `Authorization: Bearer`)
- **Query Parameters**: `organization_id` (UUID), `from_date` (ISO), `to_date` (ISO)
- **Returns**: Aggregated run counts, success rate, average duration, tool execution counts, and recent workflow telemetry.

---

## 4. Frontend Component Architecture

All UI components reside in `apps/web/src/features/dashboard/` and adhere to the Module 16 Design System (`tokens.css`, Tailwind CSS, TanStack Query, Lucide icons):

| Component | File Path | Description |
| :--- | :--- | :--- |
| `AdminDashboardPage` | `pages/AdminDashboardPage.tsx` | Master view composing the dashboard layout, KPI grid, analytics widgets, error banners, and authorization guards. |
| `DashboardHeader` | `components/DashboardHeader.tsx` | Executive header with organization role badge, period filters (`7d`, `30d`, `90d`), refresh button, and timestamp. |
| `MetricCard` | `components/MetricCard.tsx` | Reusable KPI metric card with custom iconography, accent colors, trend indicators, badges, and skeleton loading. |
| `TicketAnalyticsCharts` | `components/TicketAnalyticsCharts.tsx` | Visual status pipeline progress bar, priority breakdown badges, and accessible SVG daily volume trend chart. |
| `KnowledgeBaseOverview` | `components/KnowledgeBaseOverview.tsx` | RAG documentation metrics, chunk vector embedding progress, and ingestion pipeline health indicators. |
| `AgentActivityOverview` | `components/AgentActivityOverview.tsx` | AI agent workflow execution reliability, latency metrics, tool call counts, and recent execution stream. |
| `ApprovalSummaryWidget` | `components/ApprovalSummaryWidget.tsx` | Human-in-the-loop governance widget summarizing pending action proposals, risk levels, and direct review links. |
| `RecentTicketsTable` | `components/RecentTicketsTable.tsx` | Table of latest 5 support tickets with formatted ticket numbers, priority pills, status badges, and assignees. |
| `RecentActivityFeed` | `components/RecentActivityFeed.tsx` | Audit stream displaying administrative, document, and ticket events with contextual action icons and relative timestamps. |

---

## 5. Verification & Automated Test Coverage

The implementation is verified through comprehensive automated test suites covering backend services, permission enforcement, tenant isolation, and frontend React rendering:

- **AI Microservice**: `apps/ai-service/tests/test_workflow.py`
  - Internal analytics endpoint authorization (`X-Internal-Service-Token`)
  - Aggregation metrics computation and tenant parameter validation
- **Backend API Server**: `apps/api/tests/dashboard.test.ts`
  - Admin/Owner access allowed (200 OK)
  - Member role forbidden (403 Forbidden)
  - Unauthenticated requests rejected (401 Unauthorized)
  - Organization boundary validation (404 for unassociated organizations)
  - Period filtering (`7d`, `30d`, `90d`)
  - AI Service degradation resilience (returns zeroed AI metrics if microservice is down without crashing the entire dashboard)
- **Frontend Web Application**: `apps/web/tests/dashboard.test.tsx`
  - Operations dashboard overview rendering with real KPI values
  - Period switcher triggering refetch with updated period query
  - Member role warning banner preventing unauthorized viewing
  - Error alert with functional retry button
- **Monorepo Suite Summary**:
  - Web: 49 passing tests (0 failures)
  - API: 215 passing tests (0 failures)
  - AI Service: 165 passing tests (0 failures)
  - **Total Monorepo Tests: 429 passing tests across all modules**
  - **TypeScript: 0 typecheck errors in both `@opspilot/api` and `@opspilot/web`**
  - **Vite Production Build: Succeeded in 9.96s**
