# Module 21: Ticket & Approval UI Documentation

## 1. Overview & Architecture

Module 21 completes the end-to-end integration of Enterprise Ticket Operations and Human-in-the-Loop (HITL) Agent Approval in the OpsPilot AI React web frontend. 

It establishes a bidirectional link between support operations (Tickets) and autonomous AI agent mutation proposals (Agent Approvals), with strict Maker-Checker security governance, parameter diff auditing, and granular permission enforcement.

### Key Capabilities
1. **Interactive Ticket Management**:
   - Ticket list with status filter pills, priority badges, category chips, and formatted ticket codes (`TICK-000101`).
   - Summary metric counters for Open, In Progress, Waiting on Customer, Resolved, and Closed tickets.
   - Ticket detail view with full conversation/comments feed, internal notes, audit activity timeline, and status transition action buttons.
2. **AI Action Proposal Integration**:
   - Active ticket details surface linked agent proposals (`proposedAction.ticketId`).
   - Prominently displays tool call name, risk tier (`low`, `medium`, `high`, `critical`), justification, and real-time status.
   - Direct deep-link navigation between Ticket Details and Proposal Review.
3. **Dedicated Approval Review Experience (`ApprovalDetailPage`)**:
   - Accessible via `/organizations/:organizationId/approvals/:approvalId`.
   - Comprehensive breadcrumb trail and metadata inspection (Risk, Tool, Status, Requester, Expiration).
   - Structured visual diff inspector (`ActionDiffViewer`) for proposed parameters before mutation.
   - Downstream execution record inspection (execution status, error payload, completed timestamp).
4. **Maker-Checker Security Policy**:
   - Platform policy strictly prohibits operators from self-approving high-risk or critical-risk proposals they originated (`requestedBy === currentUserId`).
   - Disables execution controls and displays an explicit security alert banner informing the operator that another administrator must review and authorize the action.
   - Restricts approval/rejection actions to authorized organization staff (`isOwner || isAdmin`).

---

## 2. Component & Hook Architecture

### TanStack Query Approvals Hook (`apps/web/src/features/agent-approvals/hooks/useApprovals.ts`)
- `useProposalList(orgId, filters)`: Cached queries with automatic invalidation on decision.
- `useProposalDetails(orgId, approvalId)`: Fetches individual proposal with full decision & execution audit records.
- `useApproveProposal(orgId)`: Optimistic updates and invalidation of proposal queries.
- `useRejectProposal(orgId)`: Rejection with mandatory justification/reason string.
- `useCancelProposal(orgId)`: Cancellation by requesting agent or admin.

### Approval Detail Page (`apps/web/src/features/agent-approvals/pages/ApprovalDetailPage.tsx`)
- Renders full lifecycle details: Proposal Header, Risk Badge, Status Badge, Justification Card, Proposed Action Payload Diff Viewer, Linked Ticket/Resource Reference, Reviewer Decision Log, and Execution Outcome Card.
- Modal dialogs for Authorization (`ApproveActionDialog`) and Rejection (`RejectActionDialog`).

### Ticket Detail Integration (`apps/web/src/features/tickets/pages/TicketDetailsPage.tsx`)
- Queries active proposals matching `item.proposedAction?.ticketId === ticketId`.
- Surfaces interactive review cards with direct routing to `/organizations/:organizationId/approvals/:proposalId`.

---

## 3. Verification & Test Suite

The comprehensive test suite `apps/web/tests/tickets-approvals.test.tsx` validates:
1. **Ticket Listing**: Formatted ticket numbers, priority badges, and status counters.
2. **Ticket Details with AI Proposal**: Detection and presentation of related AI action proposals with deep links.
3. **Approval Inbox**: Pending proposal lists, risk badges, tool names, and Maker-Checker banners.
4. **Approval Detail & Execution**: Dedicated inspection page, payload parameter diff viewer, and confirmed authorization execution call to backend API.

All 4 integration tests and the full suite of 62 web tests pass with zero regressions.
