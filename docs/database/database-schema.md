# OpsPilot AI — Database Schema Reference

## 1. Database Architecture Overview

- **Engine**: PostgreSQL 16
- **Extensions**:
  - `uuid-ossp` / `gen_random_uuid()`: Cryptographically secure UUID generation.
  - `vector` (pgvector 0.3.6+): High-performance vector embeddings storage and HNSW/IVFFlat indexing.
- **Role & Schema Isolation**:
  - `app` schema: Owned by role `opspilot_api`.
  - `ai` schema: Owned by role `opspilot_ai`.
  - Master DB administrator: `opspilot_admin` (used strictly during initial bootstrap).

---

## 2. Schema: `app` (Core Business Domain)

### 2.1 `app.users`
Stores global user identities across the platform.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Normalized lowercase email address |
| `password_hash` | `TEXT` | `NOT NULL` | Argon2id password hash |
| `name` | `VARCHAR(255)` | `NOT NULL` | Full display name |
| `platform_role` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'user'` | `user` or `platform_admin` |
| `is_verified` | `BOOLEAN` | `NOT NULL, DEFAULT false` | Email verification flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Record update timestamp |

### 2.2 `app.organizations`
Houses multi-tenant workspaces.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique organization identifier |
| `name` | `VARCHAR(255)` | `NOT NULL` | Organization name |
| `slug` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | URL-safe slug |
| `created_by` | `UUID` | `NOT NULL, REFERENCES app.users(id)` | Organization creator |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Update timestamp |

### 2.3 `app.organization_members`
Defines tenant membership and RBAC roles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique membership identifier |
| `organization_id`| `UUID` | `NOT NULL, REFERENCES app.organizations(id) ON DELETE CASCADE` | Organization foreign key |
| `user_id` | `UUID` | `NOT NULL, REFERENCES app.users(id) ON DELETE CASCADE` | User foreign key |
| `role` | `VARCHAR(50)` | `NOT NULL` | `owner`, `admin`, `agent`, `member`, `viewer` |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Membership grant timestamp |

*Composite Unique Constraint*: `UNIQUE (organization_id, user_id)`

### 2.4 `app.tickets`
Core enterprise IT/DevOps support incidents.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Ticket UUID |
| `ticket_number` | `INTEGER` | `NOT NULL` | Human-readable sequential ID within org |
| `organization_id`| `UUID` | `NOT NULL, REFERENCES app.organizations(id)` | Tenant identifier |
| `title` | `VARCHAR(255)` | `NOT NULL` | Ticket subject |
| `description` | `TEXT` | `NOT NULL` | Incident body |
| `status` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'open'` | `open`, `in_progress`, `waiting`, `resolved`, `closed` |
| `priority` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'medium'` | `low`, `medium`, `high`, `urgent` |
| `created_by` | `UUID` | `NOT NULL, REFERENCES app.users(id)` | Author |
| `assigned_to` | `UUID` | `REFERENCES app.users(id)` | Assignee |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Update timestamp |

*Indexes*:
- `idx_tickets_org_created_at`: `(organization_id, created_at DESC)`
- `idx_tickets_org_status`: `(organization_id, status)`

### 2.5 `app.agent_action_proposals`
Stateful mutations proposed by autonomous AI agents awaiting human approval.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Proposal identifier |
| `organization_id`| `UUID` | `NOT NULL, REFERENCES app.organizations(id)` | Tenant identifier |
| `run_id` | `VARCHAR(100)` | `NOT NULL` | Associated LangGraph run identifier |
| `thread_id` | `VARCHAR(100)` | `NOT NULL` | Associated conversational thread ID |
| `requested_by` | `UUID` | `NOT NULL` | User or agent ID requesting action |
| `action_type` | `VARCHAR(100)` | `NOT NULL` | Mutation action name (e.g. `tickets_update_priority`) |
| `tool_name` | `VARCHAR(100)` | `NOT NULL` | Registered tool name |
| `risk_level` | `VARCHAR(50)` | `NOT NULL` | `low`, `medium`, `high`, `critical` |
| `proposal_payload`| `JSONB` | `NOT NULL` | Strongly typed mutation arguments |
| `status` | `VARCHAR(50)` | `NOT NULL, DEFAULT 'awaiting_approval'` | `awaiting_approval`, `approved`, `rejected`, `executed`, `cancelled`, `expired` |
| `justification` | `TEXT` | `NULLABLE` | Agent reasoning for proposing mutation |
| `expires_at` | `TIMESTAMPTZ` | `NULLABLE` | Expiration window |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Update timestamp |

---

## 3. Schema: `ai` (Cognitive & Vector Domain)

### 3.1 `ai.document_chunks`
Stores segmented text chunks and vector embeddings for semantic retrieval.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Chunk identifier |
| `document_id` | `UUID` | `NOT NULL` | Document reference in `app.documents` |
| `organization_id`| `UUID` | `NOT NULL` | Tenant identifier |
| `chunk_index` | `INTEGER` | `NOT NULL` | 0-based chunk sequence in document |
| `content` | `TEXT` | `NOT NULL` | Cleaned textual content |
| `token_count` | `INTEGER` | `NOT NULL` | Exact token count (tiktoken) |
| `embedding` | `vector(1536)` | `NOT NULL` | OpenAI text-embedding-3-small vector |
| `tsv` | `tsvector` | `GENERATED ALWAYS AS (to_tsvector('english', content)) STORED` | Full-text search vector |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Timestamp |

*Indexes*:
- `idx_chunks_embedding_hnsw`: `embedding vector_cosine_ops USING hnsw (m = 16, ef_construction = 64)`
- `idx_chunks_tsv_gin`: `tsv USING gin`
- `idx_chunks_org_doc`: `(organization_id, document_id)`

### 3.2 `ai.langgraph_checkpoints`
Durable state persistence for interruptible LangGraph workflows.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `thread_id` | `VARCHAR(255)` | `NOT NULL` | Conversation thread identifier |
| `checkpoint_id` | `VARCHAR(255)` | `NOT NULL` | Monotonically increasing checkpoint ID |
| `parent_checkpoint_id`| `VARCHAR(255)` | `NULLABLE` | Parent node reference |
| `checkpoint` | `BYTEA / JSONB` | `NOT NULL` | Serialized cognitive agent state |
| `metadata` | `JSONB` | `NOT NULL, DEFAULT '{}'` | Step metadata, run IDs, and timestamps |

*Primary Key*: `(thread_id, checkpoint_id)`

### 3.3 `ai.user_memories`
Consent-scoped persistent agent memories (Module 15).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Memory identifier |
| `organization_id`| `UUID` | `NOT NULL` | Tenant boundary |
| `user_id` | `UUID` | `NOT NULL` | User boundary |
| `memory_type` | `VARCHAR(50)` | `NOT NULL` | `preference`, `fact`, `workflow_context` |
| `content` | `TEXT` | `NOT NULL` | Approved contextual memory string |
| `confidence` | `REAL` | `NOT NULL` | Extraction confidence score (0.0 - 1.0) |
| `source_message_id`| `VARCHAR(100)` | `NULLABLE` | Source message reference |
| `expires_at` | `TIMESTAMPTZ` | `NULLABLE` | Optional TTL expiration |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Update timestamp |
