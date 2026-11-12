# OpsPilot AI – Memory Privacy & User Consent Specification

## 1. Zero-Trust Privacy Principle

In enterprise operations, AI memory can easily become a vector for unintended data leakage across organizational hierarchies or team boundaries. OpsPilot AI implements a strict **Zero-Trust Privacy Model** for all agent memory operations:

```
[User Token (user_id=U1)] 
         |
         v
+-----------------------------------------------------------+
| Node.js API Gateway (AgentMemoryService)                   |
| - Verifies req.user.id === target_user_id                 |
| - Rejects non-matching IDs with 403 (MEMORY_ACCESS_DENIED)|
+-----------------------------------------------------------+
         |
         | (x-internal-service-token)
         v
+-----------------------------------------------------------+
| Python AI Microservice (ai.agent_memories)                 |
| - Scoped strictly to WHERE organization_id=O1 AND user_id=U1|
| - Embeddings HNSW vector search scoped to (O1, U1)        |
+-----------------------------------------------------------+
```

### Administrative Non-Access
Even users holding the `admin` or `owner` role in an organization cannot inspect or export other users' personal memories. Personal preferences (e.g., preferred programming languages, documentation detail level, notification preferences) belong exclusively to the individual employee.

---

## 2. Consent Framework & Default Off Policy

All long-term memory capabilities default to **OFF**:

| Setting | Default | Description |
|---|---|---|
| `memory_enabled` | `false` | Master consent switch. When false, zero memories are retrieved or saved. |
| `memory_extraction_enabled` | `false` | Opt-in switch allowing agents to propose durable candidate memories from chat. |
| `episodic_memory_enabled` | `false` | Opt-in switch allowing multi-turn episodic workflow summarization. |
| `retention_days` | `null` | Optional TTL (e.g. 30, 90, 180, 365 days). Automatically marks expired memories. |

### Confirmation Workflow
1. When `memory_extraction_enabled` is active, the agent extracts durable preferences from conversation messages.
2. The candidates are returned in `data.memory_proposals` to the frontend.
3. Candidates are **NOT** persisted into `ai.agent_memories` until the human user explicitly clicks **"Approve & Save"**.
4. The user may edit the title, content, or category before approving, or dismiss it entirely.

---

## 3. Right to be Forgotten (Bulk Purge)

Users maintain complete control over their personal agent memory lifecycle:
- Individual memory items can be deleted at any time via `DELETE /api/v1/organizations/:orgId/agent/memories/:memoryId`.
- A complete purge of all stored memories, embeddings, and episodic summaries is supported via `DELETE /api/v1/organizations/:orgId/agent/memories`.
- All deletions immediately invalidate and delete associated vector embeddings in `ai.agent_memory_embeddings`.
- Deletions are audited in `ai.agent_memory_events` for enterprise compliance.
