# OpsPilot AI – Support Ticket API Reference

This document provides a comprehensive REST API specification for all Support Ticket, Assignment, Status Workflow, Comment, and Activity endpoints implemented in Module 05 for **OpsPilot AI**.

Base Path: `/api/v1/organizations/:organizationId/tickets`

All endpoints require authentication via Bearer JWT:
`Authorization: Bearer <accessToken>`

Active organization membership is verified dynamically on every request.

---

## 1. Ticket Collection Endpoints

### 1.1 Create Ticket

Create a new support ticket. The authenticated user is automatically set as the creator.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/tickets`
- **Auth**: Required (`requireOrganizationContext`, active member)
- **Headers**: `Content-Type: application/json`

#### Request Body

```json
{
  "subject": "Unable to access billing dashboard",
  "description": "Getting a 500 internal server error when navigating to billing history.",
  "category": "billing",
  "priority": "high"
}
```

#### Response: `201 Created`

```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": "77777777-7777-4777-8777-777777777771",
      "organizationId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "ticketNumber": 1,
      "formattedTicketNumber": "TKT-000001",
      "subject": "Unable to access billing dashboard",
      "description": "Getting a 500 internal server error when navigating to billing history.",
      "category": "billing",
      "priority": "high",
      "status": "open",
      "createdByUserId": "11111111-1111-4111-8111-111111111111",
      "assignedToUserId": null,
      "resolvedAt": null,
      "closedAt": null,
      "archivedAt": null,
      "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T10:00:00.000Z",
      "creator": {
        "id": "11111111-1111-4111-8111-111111111111",
        "name": "Alice Smith",
        "email": "alice@example.com"
      },
      "assignee": null
    }
  }
}
```

```bash
curl -X POST http://localhost:4000/api/v1/organizations/$ORG_ID/tickets \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Cannot login", "description": "Login button disabled", "category": "account_access"}'
```

---

### 1.2 List Tickets

Retrieve paginated tickets filtered by status, priority, category, or search keywords.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/tickets`
- **Auth**: Required (`requireOrganizationContext`, active member)
- **Query Parameters**:
  - `page`: Integer (default: 1)
  - `limit`: Integer (1-100, default: 20)
  - `search`: Keyword string (searches subject, description, ticket number)
  - `status`: `open` | `in_progress` | `waiting_on_customer` | `resolved` | `closed`
  - `priority`: `low` | `medium` | `high` | `urgent`
  - `category`: `technical_support` | `account_access` | `bug_report` | `billing` | `feature_request` | `general`
  - `assignedTo`: UUID of assignee
  - `createdBy`: UUID of creator
  - `sortBy`: `created_at` | `updated_at` | `ticket_number` | `priority` | `status` (default: `created_at`)
  - `sortOrder`: `asc` | `desc` (default: `desc`)
  - `archived`: Boolean (default: `false`)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "77777777-7777-4777-8777-777777777771",
        "organizationId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "ticketNumber": 1,
        "formattedTicketNumber": "TKT-000001",
        "subject": "Unable to access billing dashboard",
        "category": "billing",
        "priority": "high",
        "status": "open",
        "createdByUserId": "11111111-1111-4111-8111-111111111111",
        "assignedToUserId": null,
        "createdAt": "2026-11-03T10:00:00.000Z",
        "updatedAt": "2026-11-03T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 1.3 Dashboard Summary Metrics

Retrieve access-scoped aggregate counts for dashboard metric widgets.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/tickets/summary`
- **Auth**: Required (`requireOrganizationContext`, active member)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "total": 45,
    "open": 15,
    "inProgress": 12,
    "waitingOnCustomer": 8,
    "resolved": 7,
    "closed": 3,
    "urgent": 2,
    "high": 9
  }
}
```

---

## 2. Single Ticket Operations

### 2.1 Get Ticket Details

Retrieve comprehensive ticket information.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/tickets/:ticketId`
- **Auth**: Required (`requireOrganizationContext`, permitted ticket viewer)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": "77777777-7777-4777-8777-777777777771",
      "formattedTicketNumber": "TKT-000001",
      "subject": "Unable to access billing dashboard",
      "description": "Getting a 500 internal server error when navigating to billing history.",
      "category": "billing",
      "priority": "high",
      "status": "open",
      "createdByUserId": "11111111-1111-4111-8111-111111111111",
      "assignedToUserId": "22222222-2222-4222-8222-222222222222",
      "resolvedAt": null,
      "closedAt": null,
      "archivedAt": null,
      "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T10:30:00.000Z",
      "creator": {
        "id": "11111111-1111-4111-8111-111111111111",
        "name": "Alice Smith",
        "email": "alice@example.com"
      },
      "assignee": {
        "id": "22222222-2222-4222-8222-222222222222",
        "name": "Bob Support",
        "email": "bob@example.com"
      }
    }
  }
}
```

---

### 2.2 Update Ticket Details

Update subject, description, or category. Members may only edit their own unassigned open tickets.

- **Endpoint**: `PATCH /api/v1/organizations/:organizationId/tickets/:ticketId`
- **Auth**: Required (`requireOrganizationContext`, permitted editor)

#### Request Body

```json
{
  "subject": "Updated: Cannot access billing dashboard",
  "description": "Issue also happens on Firefox and Safari."
}
```

---

### 2.3 Assign or Unassign Ticket

Assign ticket to an active organization member, or pass `null` to unassign.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/tickets/:ticketId/assign`
- **Auth**: Required (`requireOrganizationContext`, role `owner` or `admin`)

#### Request Body (Assign)

```json
{
  "assignedToUserId": "22222222-2222-4222-8222-222222222222"
}
```

#### Request Body (Unassign)

```json
{
  "assignedToUserId": null
}
```

---

### 2.4 Update Ticket Priority

Change ticket priority level.

- **Endpoint**: `PATCH /api/v1/organizations/:organizationId/tickets/:ticketId/priority`
- **Auth**: Required (`requireOrganizationContext`, role `owner` or `admin`)

#### Request Body

```json
{
  "priority": "urgent"
}
```

---

### 2.5 Status Workflow Transition

Execute a status change validated against the ticket workflow state machine.

- **Endpoint**: `PATCH /api/v1/organizations/:organizationId/tickets/:ticketId/status`
- **Auth**: Required (`requireOrganizationContext`, authorized transition actor)

#### Request Body

```json
{
  "status": "in_progress"
}
```

---

### 2.6 Archive Ticket

Soft-archive a ticket using `archived_at`.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/tickets/:ticketId/archive`
- **Auth**: Required (`requireOrganizationContext`, role `owner` or `admin`)

---

## 3. Comments & Activity Endpoints

### 3.1 Add Comment / Internal Note

Add a public reply or a staff-only internal note.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/tickets/:ticketId/comments`
- **Auth**: Required (`requireOrganizationContext`, permitted ticket viewer)

#### Request Body (Public Reply)

```json
{
  "body": "We have identified the root cause and are preparing a hotfix.",
  "visibility": "public"
}
```

#### Request Body (Internal Note — Owner/Admin Only)

```json
{
  "body": "Database deadlock resolved after killing idle session on replica 2.",
  "visibility": "internal"
}
```

---

### 3.2 List Comments

List comments for a ticket. Internal notes are automatically filtered out for standard members.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/tickets/:ticketId/comments`
- **Auth**: Required (`requireOrganizationContext`, permitted ticket viewer)
- **Query Parameters**: `limit` (default: 50), `offset` (default: 0)

---

### 3.3 List Activity History

Retrieve chronological audit log events for the ticket.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/tickets/:ticketId/activity`
- **Auth**: Required (`requireOrganizationContext`, permitted ticket viewer)
- **Query Parameters**: `limit` (default: 50), `offset` (default: 0)
