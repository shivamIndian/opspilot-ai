# OpsPilot AI – Agent Memory Architecture

## 1. Architectural Overview

The Persistent Agent Memory system provides OpsPilot AI agents with long-term, cross-conversation context while preserving strict enterprise boundaries around security, consent, privacy, and data isolation.

Unlike primitive chat memory systems that indiscriminately dump raw chat history into subsequent prompts, OpsPilot AI enforces a **Three-Tier Memory Separation Hierarchy**:

```
+-----------------------------------------------------------------------------------+
|                        OPSPILOT AGENT MEMORY LAYERS                               |
+-----------------------------------------------------------------------------------+
| 1. SHORT-TERM EXECUTION STATE (LangGraph Thread Checkpointer)                     |
|    - Scope: Active run/thread only                                                |
|    - Storage: ai.checkpoints & ai.checkpoint_blobs                                |
|    - Lifespan: Session execution window                                           |
+-----------------------------------------------------------------------------------+
| 2. LONG-TERM PERSONAL MEMORY (Screened & User-Approved Preferences/Facts)         |
|    - Scope: Strictly isolated to (organization_id, user_id)                       |
|    - Types: preference, contextual_fact, recurring_pattern                        |
|    - Storage: ai.agent_memories & ai.agent_memory_embeddings                      |
|    - Lifespan: Retained per user consent (configurable retention days or purge)   |
+-----------------------------------------------------------------------------------+
| 3. EPISODIC WORKFLOW MEMORY (Compact Synthesized Summaries)                       |
|    - Scope: Cross-turn high-level workflow context                                |
|    - Storage: ai.agent_conversation_summaries                                     |
|    - Invariant: Never stores raw transcripts or unvetted credentials              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Invariants & Boundaries

1. **Strict User and Organization Partitioning**:
   - Every memory record is indexed by both `organization_id` and `user_id`.
   - Normal users only read and manage their own memories.
   - Admins and organization owners cannot view individual users' personal memories.
   - Cross-organization or cross-user memory leakage is architecturally impossible.

2. **Zero Unconsented Persistence (Consent-First Policy)**:
   - User memory is `disabled` by default (`memory_enabled = false`).
   - Persistent memory is never activated without explicit user consent.
   - Proactive candidate extraction requires explicit opt-in (`memory_extraction_enabled = true`).
   - Extracted candidates are presented as proposals requiring explicit user confirmation before being stored.

3. **Advisory Reference Context Only**:
   - Memories are injected into LLM contexts as bounded, untrusted reference context.
   - Memories **cannot** grant permissions, bypass approval gates, override organization security policies, or escalate agent privilege.

---

## 3. Database Schema Overview (`ai` schema)

All memory tables reside exclusively in the `ai` PostgreSQL schema managed by Alembic:

- `ai.agent_memories`:
  - `id` (UUID PK)
  - `organization_id` (UUID)
  - `user_id` (UUID)
  - `memory_type` (`preference`, `contextual_fact`, `workflow_summary`, `recurring_pattern`)
  - `category` (VARCHAR 50)
  - `title` (VARCHAR 200)
  - `content` (TEXT)
  - `content_hash` (CHAR 64 SHA-256)
  - `importance_score` (SMALLINT 1..10)
  - `status` (`active`, `expired`, `deleted`)
  - `source_type` (`user_explicit`, `agent_proposed`, `system_inferred`)
  - `source_reference` (UUID nullable)
  - `consent_version` (VARCHAR 50)
  - `created_at`, `updated_at`, `expires_at`, `deleted_at`

- `ai.agent_memory_embeddings`:
  - `id` (UUID PK)
  - `organization_id`, `user_id`, `memory_id` (FK cascade)
  - `provider`, `model`, `dimensions`, `embedding_space`
  - `embedding` (`vector(1536)`) with HNSW cosine distance index (`vector_cosine_ops`)

- `ai.agent_memory_settings`:
  - `id` (UUID PK)
  - `organization_id`, `user_id` (Unique constraint)
  - `memory_enabled` (BOOLEAN, default false)
  - `memory_extraction_enabled` (BOOLEAN, default false)
  - `episodic_memory_enabled` (BOOLEAN, default false)
  - `retention_days` (INTEGER nullable)

- `ai.agent_conversation_summaries`:
  - Compact episodic summaries of multi-turn workflow executions.

- `ai.agent_memory_events`:
  - Immutable audit trail recording memory creation, updates, deletions, and purges.
