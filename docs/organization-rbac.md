# OpsPilot AI – Organization Role-Based Access Control (RBAC)

This document specifies the authorization matrices, role hierarchy, permission resolution mechanisms, and privilege escalation prevention rules for **OpsPilot AI**.

---

## 1. Role Taxonomy

OpsPilot AI strictly separates **Platform-Level Roles** from **Organization-Level Roles**.

```
+--------------------------------------------------------------------------+
| Platform Roles (app.users.platform_role)                                 |
| - user: Standard platform account                                        |
| - platform_admin: System operations, global health, infrastructure       |
+--------------------------------------------------------------------------+
                                    |
                                    v (Completely orthogonal)
+--------------------------------------------------------------------------+
| Organization Roles (app.organization_members.role)                       |
| - owner: Workspace creator/primary owner (exactly 1 active per org)       |
| - admin: Workspace delegate administrator                                |
| - member: Standard workspace contributor                                 |
+--------------------------------------------------------------------------+
```

### Critical Separation Principle

- An account with `platform_role = 'platform_admin'` **does not** automatically receive access to tenant organizations.
- A platform admin attempting to call `/api/v1/organizations/:id` without an active membership row in `app.organization_members` will receive `403 FORBIDDEN (FORBIDDEN_NOT_ORGANIZATION_MEMBER)`.

---

## 2. Granular Organization Permissions

The system defines 11 granular permissions:

| Permission             | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `organization:read`    | Read organization profile, metadata, and status         |
| `organization:update`  | Update workspace profile (name, description, logo)      |
| `organization:archive` | Soft-delete / archive the organization                  |
| `members:list`         | View member directory with roles and join dates         |
| `members:remove`       | Remove members from the workspace                       |
| `members:role_update`  | Change member role (`admin` <-> `member`)               |
| `invitations:create`   | Issue invitations to join workspace                     |
| `invitations:list`     | View pending invitations                                |
| `invitations:resend`   | Re-send invitation email and reset expiration           |
| `invitations:revoke`   | Revoke a pending invitation                             |
| `ownership:transfer`   | Atomically transfer primary ownership to another member |

---

## 3. Role-to-Permission Matrix

| Permission             | `owner` | `admin` | `member` |
| ---------------------- | :-----: | :-----: | :------: |
| `organization:read`    |   ✅    |   ✅    |    ✅    |
| `organization:update`  |   ✅    |   ✅    |    ❌    |
| `organization:archive` |   ✅    |   ❌    |    ❌    |
| `members:list`         |   ✅    |   ✅    |    ✅    |
| `members:remove`       |   ✅    |   ✅*   |    ❌    |
| `members:role_update`  |   ✅    |   ✅*   |    ❌    |
| `invitations:create`   |   ✅    |   ✅*   |    ❌    |
| `invitations:list`     |   ✅    |   ✅    |    ❌    |
| `invitations:resend`   |   ✅    |   ✅    |    ❌    |
| `invitations:revoke`   |   ✅    |   ✅    |    ❌    |
| `ownership:transfer`   |   ✅    |   ❌    |    ❌    |

_\* Subject to Role Hierarchy Constraints below._

---

## 4. Role Hierarchy & Privilege Escalation Defenses

To prevent privilege escalation and hostile administrative takeover, the business layer enforces strict hierarchical rules:

### 4.1 Single Active Owner Invariant

- Exactly **one** active owner can exist per organization at any time.
- Enforced at the database engine level via:
  ```sql
  CREATE UNIQUE INDEX idx_org_members_one_active_owner
  ON app.organization_members (organization_id)
  WHERE (role = 'owner' AND status = 'active');
  ```
- Promoting someone to `owner` cannot be done via the standard `/members/:id/role` endpoint. It requires the dedicated `/transfer-ownership` flow.

### 4.2 Admin Constraints (Horizontal & Vertical Privilege Defense)

- **Admins cannot invite Admins**: An admin cannot create an invitation with role `admin` (`FORBIDDEN_CANNOT_INVITE_ADMIN`). Only the `owner` can invite or promote admins.
- **Admins cannot promote to Admin**: Only the `owner` can promote a `member` to `admin` (`FORBIDDEN_CANNOT_PROMOTE_TO_ADMIN`).
- **Admins cannot demote or remove Admins**: An admin cannot demote or remove another admin or the owner (`FORBIDDEN_ADMIN_CANNOT_MODIFY_ADMIN`, `FORBIDDEN_CANNOT_REMOVE_ADMIN`).
- **Admins cannot archive or transfer ownership**: Restricted exclusively to the primary `owner`.

### 4.3 Self-Exit (Leave) Constraints

- A standard `member` or `admin` can leave an organization at any time via `POST /api/v1/organizations/:id/leave`.
- An `owner` **cannot** leave an active organization (`OWNER_CANNOT_LEAVE`). They must either:
  1. Transfer ownership to another member first; OR
  2. Archive the organization.

---

## 5. Middleware Enforcement Implementation

The Express application provides type-safe authorization middleware:

### `requireOrgPermission(permission)`

```ts
export const requireOrgPermission = (permission: OrganizationPermission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      return res.status(403).json({ code: 'FORBIDDEN_ORGANIZATION_CONTEXT_REQUIRED' });
    }
    if (!req.organization.permissions.includes(permission)) {
      return res.status(403).json({ code: 'INSUFFICIENT_ORGANIZATION_PERMISSIONS' });
    }
    next();
  };
};
```

### `requireOrgRole(...roles)`

```ts
export const requireOrgRole = (...roles: OrganizationRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      return res.status(403).json({ code: 'FORBIDDEN_ORGANIZATION_CONTEXT_REQUIRED' });
    }
    if (!roles.includes(req.organization.role)) {
      return res.status(403).json({ code: 'INSUFFICIENT_ORGANIZATION_ROLE' });
    }
    next();
  };
};
```
