# OpsPilot AI – Ticket Role-Based Access Control (RBAC)

This document specifies the authorization matrices, ticket visibility scoping, assignment constraints, and confidential note permissions implemented in Module 05 for **OpsPilot AI**.

---

## 1. Role Scoping & Ticket Visibility Matrix

| Operation                                               |      `owner`      |      `admin`      |            `member`             |
| ------------------------------------------------------- | :---------------: | :---------------: | :-----------------------------: |
| **List Tickets**                                        |  All org tickets  |  All org tickets  |    Created or Assigned only     |
| **View Ticket Details**                                 |  All org tickets  |  All org tickets  |    Created or Assigned only     |
| **Create Ticket**                                       |        ✅         |        ✅         |               ✅                |
| **Edit Basic Details (Subject/Desc)**                   | Any active ticket | Any active ticket | Own unassigned open ticket only |
| **Assign / Unassign Ticket**                            |        ✅         |        ✅         |               ❌                |
| **Change Priority**                                     |        ✅         |        ✅         |               ❌                |
| **Status: Operational (in_progress, waiting, resolve)** |        ✅         |        ✅         |               ❌                |
| **Status: Close Own Resolved Ticket**                   |        ✅         |        ✅         |               ✅                |
| **Status: Reopen Ticket**                               |        ✅         |        ✅         |               ❌                |
| **Add Public Comment**                                  |        ✅         |        ✅         |   ✅ (on accessible tickets)    |
| **Add Internal Note**                                   |        ✅         |        ✅         |               ❌                |
| **View Internal Notes**                                 |        ✅         |        ✅         |    ❌ (filtered at DB layer)    |
| **Archive Ticket**                                      |        ✅         |        ✅         |               ❌                |
| **View Dashboard Metrics**                              | Organization-wide | Organization-wide | Scoped to own/assigned tickets  |

---

## 2. In-Database Visibility Scoping

Visibility rules are enforced directly within PostgreSQL SQL queries, preventing data leakage or in-memory filtering vulnerabilities.

### Ticket Listing & Metric Queries

```sql
-- Owner and Admin:
SELECT * FROM app.tickets t
WHERE t.organization_id = $1 AND t.archived_at IS NULL;

-- Standard Member:
SELECT * FROM app.tickets t
WHERE t.organization_id = $1
  AND t.archived_at IS NULL
  AND (t.created_by_user_id = $2 OR t.assigned_to_user_id = $2);
```

If a member attempts to access a ticket that is not theirs via `GET /tickets/:ticketId`, the backend returns `404 Not Found` (rather than 403) to prevent unauthorized enumeration of ticket IDs.

---

## 3. Assignment Authorization Rules

Only an organization `owner` or `admin` can assign or unassign tickets.

### Intra-Organization Membership Invariant

Before updating `assigned_to_user_id`, the backend verifies:

1. The target user has an active membership record in `app.organization_members` for the **same** `organization_id`.
2. Target user's membership status is strictly `'active'` (suspended or removed members are rejected with `400 ASSIGNEE_NOT_ACTIVE_MEMBER`).
3. Cross-tenant assignment (assigning a user from Org B to Org A) is strictly rejected.

---

## 4. Comment Confidentiality Rules

OpsPilot AI provides two distinct comment visibility levels:

```
+-------------------------------------------------------------------+
|                        Ticket Comments                            |
|                                                                   |
|  [public]  ------------------> Visible to all authorized ticket  |
|                                viewers (Requester + Staff)        |
|                                                                   |
|  [internal] -----------------> Restricted strictly to            |
|                                Organization Owner & Admins        |
+-------------------------------------------------------------------+
```

- When a standard member calls `GET /tickets/:ticketId/comments`, the SQL query executes `AND c.visibility = 'public'`.
- Members attempting to send `visibility = 'internal'` receive `403 FORBIDDEN_COMMENT`.
