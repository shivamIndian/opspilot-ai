# OpsPilot AI – Ticket Security & Tenant Isolation

This document describes the security threat model, multi-tenant isolation mechanisms, row-level concurrency locking, and audit immutability implemented in Module 05 for **OpsPilot AI**.

---

## 1. Threat Model & Defensive Mitigations

| Threat                                     | Attack Vector                                                                                  | OpsPilot AI Defensive Architecture                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-Tenant IDOR**                      | Attacker passes another organization's `ticketId` or uses arbitrary `organizationId` in path.  | `requireOrganizationContext` verifies membership. All SQL queries require both `organization_id = $1` and `id = $2`. Inaccessible tickets return `404 Not Found`. |
| **Race Conditions in Ticket Numbering**    | Multiple simultaneous ticket creations generate duplicate ticket numbers.                      | Atomic `INSERT ... ON CONFLICT DO UPDATE` in `app.organization_ticket_counters` row-locks the counter within the same PostgreSQL transaction.                     |
| **Concurrent Mutation Race Conditions**    | Simultaneous updates, status changes, or assignment requests corrupt ticket state.             | Services execute `SELECT ... FROM app.tickets WHERE organization_id = $1 AND id = $2 FOR UPDATE` before updating.                                                 |
| **Cross-Tenant Assignment**                | Attacker assigns a user belonging to Organization B to a ticket in Organization A.             | `memberRepository.findByOrgAndUser(orgId, targetUserId)` strictly verifies target is an active member in the exact same organization.                             |
| **Internal Note Leakage**                  | Attacker (standard member) queries API or intercepts network responses containing staff notes. | Internal notes are filtered at the database level (`AND visibility = 'public'`). Raw internal note rows never enter application memory for standard members.      |
| **Privilege Escalation via Status Change** | Member bypasses UI to reopen resolved/closed tickets or jump to closed.                        | Centralized `TicketWorkflowService` validates all state transitions against allowed topological matrix and actor role. Reopen is restricted to owner/admin.       |
| **Arbitrary Priority Escalation**          | Member attempts to mark ticket as urgent directly.                                             | Priority endpoint `PATCH /priority` requires `isOrgAdminOrOwner()`. The generic update endpoint ignores priority fields.                                          |
| **History Tampering**                      | Attacker deletes or edits past comments or activity events.                                    | Activity logs are strictly append-only. No API endpoints exist to update or delete activity logs or historical comments.                                          |

---

## 2. Row-Level Concurrency Locking

To prevent lost updates or status race conditions, critical state changes acquire an exclusive row-level lock within a database transaction:

```sql
SELECT * FROM app.tickets
WHERE organization_id = $1 AND id = $2
FOR UPDATE;
```

### Locked Operations

- Status workflow transitions (`TicketWorkflowService.transitionStatus`)
- Assignment and unassignment (`TicketAssignmentService.assignTicket`)
- Priority changes (`TicketService.updatePriority`)
- Ticket details updates (`TicketService.updateTicket`)
- Archival (`TicketService.archiveTicket`)

---

## 3. Append-Only Audit Logging & Sensitive Data Filtering

Every administrative or operational ticket action writes to `app.ticket_activity_logs` in the same transaction as the business mutation:

```
[Business Operation]  ---+
                         |---> Executed in 1 PostgreSQL Transaction
[Activity Log Insert] ---+
```

### Sensitive Data Scrubbing Rules

- Passwords, access tokens, refresh tokens, and API secrets are **never** logged.
- Only safe diffs (`old_values`, `new_values`) representing sanitized domain fields (`status`, `priority`, `assigned_to_user_id`, `subject`, `category`) are stored in `JSONB`.
- Activity logs are read-only; no endpoint allows modification or deletion of past events.
