# OpsPilot AI – Support Ticket Management Architecture

This document describes the architectural design, database modeling, concurrency controls, and multi-tenant isolation patterns implemented in Module 05 for **OpsPilot AI**.

---

## 1. Architectural Overview

The Support Ticket Management system forms the operational backbone of OpsPilot AI. It enables organizations to create, track, assign, collaborate on, and resolve customer and internal support issues within strictly isolated multi-tenant boundaries.

```mermaid
erDiagram
    app_organizations ||--o{ app_organization_ticket_counters : "maintains"
    app_organizations ||--o{ app_tickets : "owns"
    app_users ||--o{ app_tickets : "creates"
    app_users ||--o{ app_tickets : "assigned to"
    app_tickets ||--o{ app_ticket_comments : "has"
    app_users ||--o{ app_ticket_comments : "authors"
    app_tickets ||--o{ app_ticket_activity_logs : "records"
    app_users ||--o{ app_ticket_activity_logs : "acts"

    app_organization_ticket_counters {
        uuid organization_id PK, FK
        bigint last_ticket_number
        timestamptz created_at
        timestamptz updated_at
    }

    app_tickets {
        uuid id PK
        uuid organization_id FK
        bigint ticket_number
        varchar subject
        text description
        varchar category
        varchar priority
        varchar status
        uuid created_by_user_id FK
        uuid assigned_to_user_id FK
        timestamptz resolved_at
        timestamptz closed_at
        timestamptz archived_at
        timestamptz created_at
        timestamptz updated_at
    }

    app_ticket_comments {
        uuid id PK
        uuid organization_id FK
        uuid ticket_id FK
        uuid author_user_id FK
        text body
        varchar visibility
        timestamptz created_at
        timestamptz updated_at
    }

    app_ticket_activity_logs {
        uuid id PK
        uuid organization_id FK
        uuid ticket_id FK
        uuid actor_user_id FK
        varchar action
        jsonb old_values
        jsonb new_values
        jsonb metadata
        timestamptz created_at
    }
```

---

## 2. Organization-Specific Sequential Ticket Numbering

Enterprise customers require clean, sequential, human-readable ticket numbers (e.g. `TKT-000001`, `TKT-000002`) that start at `1` for each organization independently.

### Concurrency-Safe Sequence Counter

Reading `MAX(ticket_number) + 1` is vulnerable to race conditions under concurrent requests. OpsPilot AI implements an atomic, database-locked UPSERT sequence table:

```sql
INSERT INTO app.organization_ticket_counters (organization_id, last_ticket_number, updated_at)
VALUES ($1, 1, CURRENT_TIMESTAMP)
ON CONFLICT (organization_id)
DO UPDATE SET
  last_ticket_number = app.organization_ticket_counters.last_ticket_number + 1,
  updated_at = CURRENT_TIMESTAMP
RETURNING last_ticket_number;
```

#### Guarantees

1. **Row-Level Lock**: PostgreSQL acquires an exclusive row lock on the organization's counter record during the transaction.
2. **Zero Gaps / Duplicates**: If a ticket creation transaction aborts, the counter increment rolls back cleanly with the transaction.
3. **Internal UUIDs**: Internal primary keys remain non-enumerable UUIDv4 (`app.tickets.id`). The human-readable string (`TKT-000042`) is used exclusively for display and UI indexing.

---

## 3. Transactional Consistency & Atomic State Operations

Critical ticket operations enforce atomic PostgreSQL transaction boundaries combining business mutations and activity logs:

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated Member
    participant API as Express API
    participant TicketService as TicketService
    participant DB as PostgreSQL (app schema)
    participant Audit as TicketActivityRepository

    User->>API: POST /api/v1/organizations/:id/tickets { subject, description, category }
    API->>API: requireOrganizationContext (Verify membership)
    API->>TicketService: createTicket(orgId, userId, input)
    TicketService->>DB: BEGIN TRANSACTION
    TicketService->>DB: Atomic increment in app.organization_ticket_counters
    DB-->>TicketService: ticket_number = 42
    TicketService->>DB: INSERT INTO app.tickets (...)
    TicketService->>Audit: INSERT INTO app.ticket_activity_logs (action='ticket.created')
    TicketService->>DB: COMMIT TRANSACTION
    TicketService-->>API: SafeTicket (TKT-000042)
    API-->>User: 201 Created
```

### Rollback Guarantees

- If the activity log insertion fails, the entire transaction rolls back.
- If a ticket status transition fails validation, row locks are released immediately without dirty updates.
- If an assignee is invalid, no database write takes place.

---

## 4. Multi-Tenant Cross-Contamination Defense

1. **Foreign Key Constraints**: All child entities (`app.tickets`, `app.ticket_comments`, `app.ticket_activity_logs`, `app.organization_ticket_counters`) include `organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE`.
2. **Parameterized Scoping**: All SQL statements enforce `WHERE organization_id = $1`.
3. **Cross-Tenant Assignment Prevention**: When assigning a ticket, the backend explicitly verifies:
   ```sql
   SELECT id FROM app.organization_members
   WHERE organization_id = $1 AND user_id = $2 AND status = 'active';
   ```
   Users belonging to Org B cannot be assigned to Org A tickets under any circumstance.

---

## 5. Future AI Microservice Integration Points

In future modules (Modules 08–10: AI Microservice, LangGraph Workflows, Autonomous Agentic Triage):

1. **Service Authentication**:
   - AI agents will communicate with the Node.js API using internal service tokens or mTLS.
   - AI agents **cannot** modify ticket status or post internal notes without going through the authorized REST endpoints.
2. **AI Action Logging**:
   - When an AI agent performs automated triage, resolution suggestions, or categorization, it will generate distinct activity log events:
     `ticket.ai_triaged`, `ticket.ai_suggested_response`, `ticket.ai_classified`.
   - The `actor_user_id` will reference the system AI bot user or remain null with `metadata.actor = 'ai_agent'`.
3. **Vector Database Isolation**:
   - Vector embeddings of ticket descriptions and public comments stored in schema `ai` will include `organization_id UUID NOT NULL` to prevent cross-tenant knowledge leaks during RAG searches.
