# OpsPilot AI – Organization API Reference

This document provides a comprehensive REST API specification for the Organization, Membership, and Invitation endpoints introduced in Module 04 for **OpsPilot AI**.

Base Path: `/api/v1`

All requests except invitation acceptance require a valid Bearer JWT access token:
`Authorization: Bearer <accessToken>`

---

## 1. Organization Management

### 1.1 Create Organization

Create a new tenant organization. The authenticated caller becomes the primary `owner`.

- **Endpoint**: `POST /api/v1/organizations`
- **Auth**: Required (`requireAuthentication`)
- **Headers**: `Content-Type: application/json`

#### Request Body

```json
{
  "name": "Acme Technologies",
  "slug": "acme-tech",
  "description": "Enterprise engineering workspace",
  "logoUrl": "https://example.com/logos/acme.png"
}
```

#### Response: `201 Created`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Acme Technologies",
      "slug": "acme-tech",
      "description": "Enterprise engineering workspace",
      "logoUrl": "https://example.com/logos/acme.png",
      "status": "active",
      "createdBy": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T10:00:00.000Z"
    },
    "membership": {
      "id": "mem-11111111",
      "organizationId": "11111111-2222-3333-4444-555555555555",
      "userId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "role": "owner",
      "status": "active",
      "joinedAt": "2026-11-03T10:00:00.000Z"
    }
  }
}
```

#### Error Codes

- `400 VALIDATION_ERROR`: Invalid name or slug format.
- `409 SLUG_ALREADY_EXISTS`: An organization with this slug already exists.

```bash
curl -X POST http://localhost:5000/api/v1/organizations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "slug": "acme-corp"}'
```

---

### 1.2 List My Organizations

List all organizations where the authenticated user holds an active membership.

- **Endpoint**: `GET /api/v1/organizations`
- **Auth**: Required (`requireAuthentication`)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "11111111-2222-3333-4444-555555555555",
        "name": "Acme Technologies",
        "slug": "acme-tech",
        "description": "Enterprise engineering workspace",
        "logoUrl": null,
        "status": "active",
        "createdBy": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "role": "owner",
        "joinedAt": "2026-11-03T10:00:00.000Z",
        "createdAt": "2026-11-03T10:00:00.000Z",
        "updatedAt": "2026-11-03T10:00:00.000Z"
      }
    ]
  }
}
```

```bash
curl -X GET http://localhost:5000/api/v1/organizations \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 1.3 Get Organization Details

Retrieve organization details and caller's permissions.

- **Endpoint**: `GET /api/v1/organizations/:organizationId`
- **Auth**: Required (`requireOrganizationContext`, active member)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Acme Technologies",
      "slug": "acme-tech",
      "description": "Enterprise engineering workspace",
      "logoUrl": null,
      "status": "active",
      "createdBy": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T10:00:00.000Z"
    },
    "currentMembership": {
      "role": "owner",
      "permissions": [
        "organization:read",
        "organization:update",
        "organization:archive",
        "members:list",
        "members:remove",
        "members:role_update",
        "invitations:create",
        "invitations:list",
        "invitations:resend",
        "invitations:revoke",
        "ownership:transfer"
      ]
    }
  }
}
```

---

### 1.4 Update Organization Profile

Update organization name, description, or logo.

- **Endpoint**: `PATCH /api/v1/organizations/:organizationId`
- **Auth**: Required (`requireOrganizationContext`, permission `organization:update`)

#### Request Body

```json
{
  "name": "Acme Technologies International",
  "description": "Global support division"
}
```

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Acme Technologies International",
      "slug": "acme-tech",
      "description": "Global support division",
      "logoUrl": null,
      "status": "active",
      "createdBy": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T10:30:00.000Z"
    }
  }
}
```

---

### 1.5 Archive Organization

Soft-delete the organization. Requires `owner` role.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/archive`
- **Auth**: Required (`requireOrganizationContext`, role `owner`)

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Organization has been archived successfully"
}
```

---

### 1.6 View Audit Logs

Inspect administrative activity logs for this organization.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/audit-logs`
- **Auth**: Required (`requireOrganizationContext`, role `owner` or `admin`)
- **Query Params**: `limit` (default: 50), `offset` (default: 0)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "audit-uuid-1",
        "organizationId": "11111111-2222-3333-4444-555555555555",
        "actorUserId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "action": "organization.updated",
        "targetType": "organization",
        "targetId": "11111111-2222-3333-4444-555555555555",
        "metadata": { "name": "Acme Technologies International" },
        "createdAt": "2026-11-03T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 2. Membership Management

### 2.1 List Organization Members

Paginated member directory.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/members`
- **Auth**: Required (`requireOrganizationContext`, permission `members:list`)
- **Query Params**: `page` (default: 1), `limit` (default: 20), `search` (optional)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "mem-11111111",
        "organizationId": "11111111-2222-3333-4444-555555555555",
        "userId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Alice Smith",
        "email": "alice@example.com",
        "role": "owner",
        "status": "active",
        "joinedAt": "2026-11-03T10:00:00.000Z",
        "createdAt": "2026-11-03T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 2.2 Update Member Role

Change member role between `admin` and `member`. Cannot promote to `owner` (use transfer endpoint).

- **Endpoint**: `PATCH /api/v1/organizations/:organizationId/members/:memberId/role`
- **Auth**: Required (`requireOrganizationContext`, permission `members:role_update`)

#### Request Body

```json
{
  "role": "admin"
}
```

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "mem-22222222",
      "role": "admin",
      "updatedAt": "2026-11-03T11:00:00.000Z"
    }
  }
}
```

#### Error Codes

- `400 VALIDATION_ERROR`: Attempting to set role to `owner`.
- `403 FORBIDDEN_CANNOT_DEMOTE_OWNER`: Cannot demote owner.
- `403 FORBIDDEN_ADMIN_CANNOT_MODIFY_ADMIN`: Admin cannot modify another admin.

---

### 2.3 Remove Member

Remove a member from the organization.

- **Endpoint**: `DELETE /api/v1/organizations/:organizationId/members/:memberId`
- **Auth**: Required (`requireOrganizationContext`, permission `members:remove`)

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Member removed from organization successfully"
}
```

---

### 2.4 Leave Organization (Self-Exit)

Leave the organization. If the caller is the owner, they must transfer ownership first.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/leave`
- **Auth**: Required (`requireOrganizationContext`, active member)

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Successfully left the organization"
}
```

#### Error Codes

- `400 OWNER_CANNOT_LEAVE`: Primary owner cannot leave without transferring ownership.

---

### 2.5 Transfer Ownership

Atomically transfer ownership to another active member. Current owner is demoted to `admin`.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/transfer-ownership`
- **Auth**: Required (`requireOrganizationContext`, role `owner`)

#### Request Body

```json
{
  "newOwnerUserId": "33333333-3333-4333-8333-333333333333"
}
```

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Ownership transferred successfully"
}
```

---

## 3. Invitations

### 3.1 Send Invitation

Invite a user by email.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/invitations`
- **Auth**: Required (`requireOrganizationContext`, permission `invitations:create`)

#### Request Body

```json
{
  "email": "dev@company.com",
  "role": "member"
}
```

#### Response: `201 Created`

```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "inv-uuid-1",
      "organizationId": "11111111-2222-3333-4444-555555555555",
      "email": "dev@company.com",
      "role": "member",
      "status": "pending",
      "expiresAt": "2026-11-10T10:00:00.000Z",
      "createdAt": "2026-11-03T10:00:00.000Z"
    }
  }
}
```

---

### 3.2 List Pending Invitations

List pending invitations for the workspace.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/invitations`
- **Auth**: Required (`requireOrganizationContext`, permission `invitations:list`)

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "invitations": [
      {
        "id": "inv-uuid-1",
        "organizationId": "11111111-2222-3333-4444-555555555555",
        "email": "dev@company.com",
        "role": "member",
        "status": "pending",
        "expiresAt": "2026-11-10T10:00:00.000Z",
        "createdAt": "2026-11-03T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 3.3 Resend Invitation

Extend expiration by 7 days and re-email the invitation.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/invitations/:invitationId/resend`
- **Auth**: Required (`requireOrganizationContext`, permission `invitations:resend`)

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Invitation resent successfully"
}
```

---

### 3.4 Revoke Invitation

Cancel a pending invitation.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/invitations/:invitationId/revoke`
- **Auth**: Required (`requireOrganizationContext`, permission `invitations:revoke`)

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Invitation revoked successfully"
}
```

---

### 3.5 Accept Invitation

Accept an invitation using the raw token received via email. Caller must be authenticated and have a verified email matching the invitation.

- **Endpoint**: `POST /api/v1/invitations/accept`
- **Auth**: Required (`requireAuthentication`)

#### Request Body

```json
{
  "token": "4a7f9b8c2d1e0f3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
}
```

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Acme Technologies",
      "slug": "acme-tech",
      "status": "active"
    },
    "membership": {
      "id": "mem-new-uuid",
      "role": "member",
      "status": "active",
      "joinedAt": "2026-11-03T12:00:00.000Z"
    }
  }
}
```

#### Error Codes

- `400 EMAIL_NOT_VERIFIED`: User email is not verified yet.
- `400 INVITATION_INVALID`: Token hash not found.
- `400 INVITATION_EXPIRED`: Token expired.
- `400 INVITATION_NOT_PENDING`: Invitation already accepted or revoked.
- `403 INVITATION_EMAIL_MISMATCH`: Authenticated user email does not match invited email.
