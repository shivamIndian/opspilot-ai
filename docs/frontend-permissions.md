# OpsPilot AI – Frontend Permissions & RBAC Enforcement (Module 16)

## 1. Multi-Tier Permission Hierarchy

Permissions in OpsPilot AI operate across two layers:
1. **Platform Layer**: System role (`user`, `admin`, `superadmin`).
2. **Organization Layer**: Workspace role (`owner`, `admin`, `member`, `viewer`).

---

## 2. Organization Role Capabilities Matrix

| Feature / Action | Owner | Admin | Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **View Workspace Overview** | ✅ | ✅ | ✅ | ✅ |
| **View / Search Tickets** | ✅ | ✅ | ✅ | ✅ |
| **Create Ticket** | ✅ | ✅ | ✅ | ❌ |
| **View / Download Documents**| ✅ | ✅ | ✅ | ✅ |
| **Upload Documents** | ✅ | ✅ | ❌ | ❌ |
| **RAG Knowledge Search** | ✅ | ✅ | ✅ | ✅ |
| **Execute Agent Workflows** | ✅ | ✅ | ✅ | ❌ |
| **Review / Approve Proposals** | ✅ | ✅ | ❌ | ❌ |
| **Manage Agent Memory** | ✅ | ✅ | Personal only | ❌ |
| **Manage Organization Members**| ✅ | ✅ | ❌ | ❌ |
| **Invite New Members** | ✅ | ✅ | ❌ | ❌ |
| **Manage Org Settings** | ✅ | ✅ | ❌ | ❌ |
| **Delete / Archive Org** | ✅ | ❌ | ❌ | ❌ |

---

## 3. UI-Level Guardrails

UI components adapt according to the active role:

1. **Sidebar Navigation Filtering (`useNavigation.ts`)**:
   - `ADMINISTRATION` sections (Members, Invitations, Settings) are hidden from `member` and `viewer` accounts.
2. **Action Button Visibility**:
   - Approve / Reject buttons in `ApprovalCard` are disabled or hidden if the user lacks review privileges.
   - Upload actions in `DocumentsPage` are restricted to administrators.
3. **Dedicated Forbidden Page (`ForbiddenPage.tsx`)**:
   - Displayed when an unprivileged user attempts to direct-navigate to `/403` or an unauthorized administrative route.
   - Provides clear feedback and navigation back to their authorized dashboard.
4. **Backend Invariant**:
   - Frontend permission checks provide immediate UI feedback. Every API request is verified against the database and JWT cryptographic claims by the backend gateway (`requireOrganizationContext`, `requireRole`, `requireToolScope`).
