# Document Security & Threat Modeling

## 1. Threat Matrix & Mitigations

| Threat Vector                  | Attack Scenario                                                   | Mitigation Strategy                                                                                                                                 |
| :----------------------------- | :---------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Path Traversal**             | Attacker passes `../../../../etc/passwd` as storage key or org ID | `path.basename` normalization, explicit traversal checks (`..`, absolute paths), strict verification that resolved path is within `expectedOrgDir`. |
| **Spoofed MIME Types**         | Executable uploaded with `.pdf` extension                         | Magic byte signature verification (`%PDF-`, PKZip OOXML marker, UTF-8 check without null bytes).                                                    |
| **Storage Key Tampering**      | Guessing sequential document keys                                 | UUIDv4 random storage keys generated server-side. Storage key never exposed to client in API responses.                                             |
| **IDOR / Tenant Leak**         | User in Org A requests document ID in Org B                       | Multi-tenant context middleware + parameterized queries scoped to `organization_id = $1 AND id = $2`.                                               |
| **MIME Sniffing Attacks**      | Browser executes uploaded HTML/SVG masquerading as PDF            | `X-Content-Type-Options: nosniff` header sent on all download responses.                                                                            |
| **Denial of Service**          | Uploading massive multi-gigabyte files                            | Multer stream-level file size limit enforced (max 25MB).                                                                                            |
| **Orphaned File Accumulation** | Network disconnect or database deadlock leaves dead files         | Atomic compensation: if DB insert fails in transaction, storage provider immediately unlinks the saved file.                                        |

## 2. Role-Based Access Control (RBAC) Matrix

| Action                         | Organization Owner | Organization Admin | Document Uploader (Member) | Other Members |
| :----------------------------- | :----------------: | :----------------: | :------------------------: | :-----------: |
| **Upload Document**            |         ✅         |         ✅         |             ✅             |      ✅       |
| **List Documents**             |         ✅         |         ✅         |             ✅             |      ✅       |
| **View Details**               |         ✅         |         ✅         |             ✅             |      ✅       |
| **Download Active Document**   |         ✅         |         ✅         |             ✅             |      ✅       |
| **Download Archived Document** |         ❌         |         ❌         |             ❌             |      ❌       |
| **Update Metadata (Own)**      |         ✅         |         ✅         |             ✅             |      ❌       |
| **Update Metadata (Other)**    |         ✅         |         ✅         |             ❌             |      ❌       |
| **Archive Document**           |         ✅         |         ✅         |             ❌             |      ❌       |
| **Restore Document**           |         ✅         |         ✅         |             ❌             |      ❌       |
