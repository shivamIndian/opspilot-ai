# OpsPilot AI – Organization Architecture

This document describes the architectural design, lifecycle, data models, state machines, and workflows of the Organization Management system implemented in Module 04 for **OpsPilot AI**.

---

## 1. Architectural Overview

OpsPilot AI is built as a multi-tenant enterprise platform. The Organization system serves as the foundational multi-tenant boundary for teams, workspaces, support tickets, knowledge bases, and AI agent workloads.

```mermaid
erDiagram
    app_users ||--o{ app_organization_members : "belongs to"
    app_organizations ||--o{ app_organization_members : "has"
    app_organizations ||--o{ app_organization_invitations : "issues"
    app_users ||--o{ app_organization_invitations : "invited by"
    app_organizations ||--o{ app_organization_audit_logs : "records"
    app_users ||--o{ app_organization_audit_logs : "acted by"

    app_organizations {
        uuid id PK
        varchar name
        varchar slug UK
        text description
        varchar logo_url
        varchar status
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    app_organization_members {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        varchar role
        varchar status
        timestamptz joined_at
        timestamptz created_at
        timestamptz updated_at
    }

    app_organization_invitations {
        uuid id PK
        uuid organization_id FK
        varchar email
        varchar role
        varchar token_hash UK
        uuid invited_by FK
        varchar status
        timestamptz expires_at
        timestamptz accepted_at
        timestamptz revoked_at
        timestamptz created_at
        timestamptz updated_at
    }

    app_organization_audit_logs {
        uuid id PK
        uuid organization_id FK
        uuid actor_user_id FK
        varchar action
        varchar target_type
        uuid target_id
        jsonb metadata
        timestamptz created_at
    }
```

---

## 2. Core Entities & Lifecycle

### 2.1 Organizations (`app.organizations`)

Organizations represent the top-level tenant workspace.

| Field                       | Type           | Description                                              |
| --------------------------- | -------------- | -------------------------------------------------------- |
| `id`                        | `UUID`         | Primary key (`gen_random_uuid()`)                        |
| `name`                      | `VARCHAR(100)` | Human-readable organization name (e.g., "Acme Corp")     |
| `slug`                      | `VARCHAR(100)` | URL-safe slug, unique case-insensitive via `lower(slug)` |
| `description`               | `TEXT`         | Optional workspace description                           |
| `logo_url`                  | `VARCHAR(500)` | Optional URL for the organization avatar                 |
| `status`                    | `VARCHAR(20)`  | `active`, `suspended`, or `archived`                     |
| `created_by`                | `UUID`         | Foreign key to `app.users(id)`                           |
| `created_at` / `updated_at` | `TIMESTAMPTZ`  | Temporal tracking                                        |

#### Organization Status States

- **`active`**: Normal operational state. Members can access all organization resources according to their roles.
- **`suspended`**: Administratively locked (e.g. for policy violations). All access returns `403 FORBIDDEN` with code `ORGANIZATION_SUSPENDED`.
- **`archived`**: Soft-deleted by the primary owner. Organization is read-protected and returns `403 FORBIDDEN` with code `ORGANIZATION_ARCHIVED`.

---

### 2.2 Memberships (`app.organization_members`)

A user's relationship with an organization is defined by explicit membership rows.

| Role     | Description                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `owner`  | Supreme administrator. Has complete control including archiving and ownership transfer. Exactly **one** active owner per organization.  |
| `admin`  | Organization administrator. Can invite standard members, manage settings, and view audit logs. Cannot manage other admins or the owner. |
| `member` | Standard workspace member. Can view organization details and fellow members. Cannot invite or mutate settings.                          |

#### Database-Enforced Single Owner Invariant

To prevent split-brain leadership or unowned organizations, the database enforces exactly one active owner per organization using a PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX idx_org_members_one_active_owner
ON app.organization_members (organization_id)
WHERE (role = 'owner' AND status = 'active');
```

---

## 3. Workflows & Sequences

### 3.1 Organization Creation Workflow

When a user creates an organization, the creation and initial owner assignment execute inside a single atomic database transaction.

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant API as Express API
    participant OrgService as OrganizationService
    participant DB as PostgreSQL (app schema)
    participant Audit as AuditRepository

    User->>API: POST /api/v1/organizations { name, slug, description }
    API->>API: Validate input with Zod (slug format, length)
    API->>OrgService: createOrganization(userId, input)
    OrgService->>DB: BEGIN TRANSACTION
    OrgService->>DB: Check unique slug: SELECT id FROM app.organizations WHERE lower(slug) = lower($1)
    OrgService->>DB: INSERT INTO app.organizations (name, slug, description, created_by)
    OrgService->>DB: INSERT INTO app.organization_members (org_id, user_id, role='owner', status='active')
    OrgService->>Audit: INSERT INTO app.organization_audit_logs (action='organization.created')
    OrgService->>DB: COMMIT TRANSACTION
    OrgService-->>API: SafeOrganization & Member Record
    API-->>User: 201 Created { success: true, data: { organization } }
```

---

### 3.2 Member Invitation & Acceptance Flow

Invitations use cryptographic single-use tokens hashed with SHA-256 before database persistence. Raw tokens are sent exclusively via email and are never stored in the database or returned in API responses.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Org Owner / Admin
    actor Invitee as Invited User
    participant API as Express API
    participant InvService as InvitationService
    participant Email as EmailService
    participant DB as PostgreSQL
    participant Audit as AuditRepository

    Admin->>API: POST /api/v1/organizations/:id/invitations { email, role: 'member' }
    API->>API: requireOrganizationContext & requireOrgPermission('invitations:create')
    API->>InvService: createInvitation(orgId, actorUserId, email, role)
    InvService->>DB: Verify no active membership exists for this email
    InvService->>DB: Verify no pending invitation exists for (org_id, email)
    InvService->>InvService: Generate rawToken = crypto.randomBytes(32).toString('hex')
    InvService->>InvService: tokenHash = sha256(rawToken)
    InvService->>DB: INSERT INTO app.organization_invitations (status='pending', expires_at=NOW()+7days, token_hash)
    InvService->>Audit: logEvent('invitation.created')
    InvService->>Email: sendOrganizationInvitation({ email, organizationName, inviteUrl: "...?token=rawToken" })
    InvService-->>API: Return invitation record (omitting token & token_hash)
    API-->>Admin: 201 Created

    Note over Invitee,Email: Invitee clicks link in email
    Invitee->>API: POST /api/v1/invitations/accept { token: rawToken } (with User JWT)
    API->>API: requireAuthentication
    API->>InvService: acceptInvitation(userId, rawToken)
    InvService->>DB: BEGIN TRANSACTION
    InvService->>InvService: Compute sha256(rawToken)
    InvService->>DB: SELECT * FROM app.organization_invitations WHERE token_hash = $1 FOR UPDATE
    InvService->>InvService: Verify status === 'pending' AND expires_at > NOW()
    InvService->>DB: SELECT email, email_verified_at FROM app.users WHERE id = $userId
    InvService->>InvService: Verify user email matches invitation email strictly
    InvService->>DB: INSERT INTO app.organization_members (org_id, user_id, role, status='active')<br/>ON CONFLICT (org_id, user_id) DO UPDATE SET role=EXCLUDED.role, status='active'
    InvService->>DB: UPDATE app.organization_invitations SET status='accepted', accepted_at=NOW()
    InvService->>Audit: logEvent('invitation.accepted')
    InvService->>DB: COMMIT TRANSACTION
    InvService-->>API: SafeOrganization & Member
    API-->>Invitee: 200 OK { success: true, data: { organization, membership } }
```

---

### 3.3 Atomic Ownership Transfer Flow

Ownership transfer reassigns the `owner` role from the current owner to an existing active member while simultaneously demoting the previous owner to `admin`. This operation is strictly protected by row-level locks and transaction boundaries.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Current Owner
    actor NewOwner as Promoted Member
    participant API as Express API
    participant MemberService as MemberService
    participant DB as PostgreSQL
    participant Audit as AuditRepository

    Owner->>API: POST /api/v1/organizations/:id/transfer-ownership { newOwnerUserId }
    API->>API: requireOrganizationContext & requireOrgRole('owner')
    API->>MemberService: transferOwnership(orgId, actorUserId, newOwnerUserId)
    MemberService->>DB: BEGIN TRANSACTION
    MemberService->>DB: SELECT * FROM app.organization_members WHERE org_id=$1 FOR UPDATE
    MemberService->>MemberService: Verify actor is currently active owner
    MemberService->>MemberService: Verify target is currently active member/admin
    MemberService->>DB: UPDATE app.organization_members SET role='admin' WHERE org_id=$1 AND user_id=$actorUserId
    MemberService->>DB: UPDATE app.organization_members SET role='owner' WHERE org_id=$1 AND user_id=$newOwnerUserId
    MemberService->>Audit: logEvent('organization.ownership_transferred')
    MemberService->>DB: COMMIT TRANSACTION
    MemberService-->>API: Transferred Successfully
    API-->>Owner: 200 OK { success: true, message: 'Ownership transferred successfully' }
```

---

## 4. Audit Logging Architecture

Every security-sensitive event emits an immutable audit entry into `app.organization_audit_logs`.

### Captured Actions

- `organization.created`
- `organization.updated`
- `organization.archived`
- `organization.ownership_transferred`
- `member.role_updated`
- `member.removed`
- `member.left`
- `invitation.created`
- `invitation.accepted`
- `invitation.revoked`
- `invitation.resent`

Audit logs cannot be updated or deleted through the API.
