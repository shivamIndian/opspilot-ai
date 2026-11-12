# OpsPilot AI — API Reference Manual

All public business endpoints are served by the Node.js API Gateway (`http://localhost:4000/api/v1` or public ALB domain) with JSON request/response formats and RFC 7807 standardized error envelopes.

---

## 1. Authentication & Session API (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new user account with OWASP password validation |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user, issue JWT access token and HTTP-only refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Refresh Cookie | Rotate refresh session and issue new access token |
| `POST` | `/api/v1/auth/logout` | Bearer Token | Revoke active user session and clear cookies |
| `GET` | `/api/v1/auth/me` | Bearer Token | Return currently authenticated user profile |
| `POST` | `/api/v1/auth/forgot-password` | Public | Dispatch password reset token to email |
| `POST` | `/api/v1/auth/reset-password` | Public | Consume token and set new password |
| `POST` | `/api/v1/auth/verify-email` | Public | Confirm user email address |

---

## 2. Organization Multi-Tenancy API (`/api/v1/organizations`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/organizations` | Bearer Token | Create new organization and assign caller as `owner` |
| `GET` | `/api/v1/organizations` | Bearer Token | List all organizations the user is a member of |
| `GET` | `/api/v1/organizations/:orgId` | Org Member | Retrieve organization metadata |
| `GET` | `/api/v1/organizations/:orgId/members` | Org Member | List active organization members and roles |
| `POST` | `/api/v1/organizations/:orgId/invitations` | Org Admin | Invite new user by email with specific role |
| `POST` | `/api/v1/organizations/invitations/:token/accept` | Bearer Token | Accept organization invitation |

---

## 3. Support Ticket Management API (`/api/v1/organizations/:orgId/tickets`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `.../tickets` | `tickets:create` | Create a new support ticket (generates sequential ticket number) |
| `GET` | `.../tickets` | `tickets:read` | List organization tickets with filtering, pagination, and search |
| `GET` | `.../tickets/:ticketId` | `tickets:read` | Retrieve ticket details, comments, and event timeline |
| `PATCH` | `.../tickets/:ticketId` | `tickets:write` | Update ticket status, priority, or assigned agent |
| `POST` | `.../tickets/:ticketId/comments`| `tickets:read` | Add public comment or internal diagnostic note |

---

## 4. Document Management & Ingestion API (`/api/v1/organizations/:orgId/documents`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `.../documents` | `docs:write` | Upload PDF/DOCX/TXT file (multipart/form-data, max 25MB) |
| `GET` | `.../documents` | `docs:read` | List organizational documents with processing status |
| `GET` | `.../documents/:documentId` | `docs:read` | Retrieve document metadata and processing statistics |
| `GET` | `.../documents/:documentId/download`| `docs:read` | Authenticated file download stream |
| `DELETE`| `.../documents/:documentId` | `docs:delete` | Soft-delete / archive document and remove from RAG search |

---

## 5. Knowledge Base & Hybrid Retrieval API (`/api/v1/organizations/:orgId/knowledge`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `.../knowledge/search` | `docs:read` | Hybrid RAG retrieval combining pgvector cosine and BM25 search |
| `POST` | `.../knowledge/answer` | `docs:read` | Generate grounded LLM response with citation validation |

---

## 6. Human-in-the-Loop Agent Approvals API (`/api/v1/organizations/:orgId/agent/approvals`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `.../approvals` | `agent:read` | List action proposals awaiting review |
| `GET` | `.../approvals/:proposalId`| `agent:read` | Inspect proposed mutation payload, diff, and agent rationale |
| `POST`| `.../approvals/:proposalId/approve`| `agent:approve` | Approve action (enforces maker-checker segregation) |
| `POST`| `.../approvals/:proposalId/reject`| `agent:approve` | Reject action with reviewer justification note |
| `POST`| `.../approvals/:proposalId/cancel`| `agent:write` | Cancel action proposal before decision |

---

## 7. LangGraph Agent Workflows API (`/api/v1/organizations/:orgId/agent/workflows`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `.../workflows/run` | `agent:execute` | Initiate stateful cognitive workflow run with streaming support |
| `GET` | `.../workflows/runs/:runId` | `agent:read` | Inspect workflow run execution state and step history |
| `POST` | `.../workflows/runs/:runId/resume` | `agent:execute` | Resume workflow run following human-in-the-loop decision |

---

## 8. Agent Memory & Privacy Control API (`/api/v1/organizations/:orgId/agent/memories`)

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `.../memories` | Org Member | Retrieve user's own consent-scoped active memories |
| `POST` | `.../memories` | Org Member | Manually add approved context memory |
| `DELETE`| `.../memories/:memoryId`| Org Member | Permanently delete contextual memory |
| `DELETE`| `.../memories` | Org Member | "Forget all" privacy deletion |

---

## 9. Monitoring & AI Evaluation API

| Method | Endpoint | Auth / Permission | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/organizations/:orgId/dashboard` | `org:read` | Return aggregated operations KPIs, ticket velocity, and agent metrics |
| `GET` | `/api/v1/organizations/:orgId/agent/monitoring`| `org:admin` | Live agent performance metrics, latency p95, tool failure breakdown |
| `GET` | `/api/v1/organizations/:orgId/ai/evaluation` | `org:admin` | RAG Triad scores, evaluation dataset summaries, and run history |
| `POST`| `/api/v1/organizations/:orgId/ai/evaluation/runs`| `org:admin`| Trigger automated evaluation benchmark run |

---

## 10. Internal Tool Gateway (`/api/v1/internal/tools` — Internal Only)

Requires HTTP Header `X-Internal-Service-Token` matching `AI_SERVICE_INTERNAL_TOKEN` and a cryptographic JWT delegation token:

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/internal/tools` | Internal Token | Tool discovery catalog with JSON Schema parameter definitions |
| `POST` | `/api/v1/internal/tools/tickets/create-proposal` | Delegation Token | Create validated action proposal for ticket creation |
| `POST` | `/api/v1/internal/tools/tickets/update-proposal` | Delegation Token | Create validated action proposal for ticket priority/status escalation |
| `POST` | `/api/v1/internal/tools/tickets/assign-proposal` | Delegation Token | Create validated action proposal for assigning ticket to agent |
