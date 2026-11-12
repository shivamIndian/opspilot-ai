# OpsPilot AI – Memory Lifecycle & Deduplication Management

## 1. Lifecycle State Machine

Each memory item transitions through distinct lifecycle states:

```
[Candidate Proposal] (Unsaved)
         |
         | User Clicks "Approve & Save"
         v
     [ACTIVE] <--------------------+
         |                         |
         +--> User Edits --------->+ (Re-screens & Re-indexes Embedding)
         |
         +--> Retention TTL Passes -> [EXPIRED]
         |
         +--> User Deletes / Purges -> [DELETED] (Embeddings Cascade Deleted)
```

---

## 2. Content Hashing & Deduplication

To prevent duplicate memories from accumulating when users interact frequently with the agent, OpsPilot AI enforces **Normalized SHA-256 Hashing**:

1. Content is lowercased and stripped of redundant whitespace:
   ```python
   normalized = " ".join(text_content.lower().strip().split())
   content_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
   ```
2. When creating a memory, `MemoryConsolidationService.check_exact_duplicate` queries:
   ```sql
   SELECT id FROM ai.agent_memories
   WHERE organization_id = :org_id 
     AND user_id = :user_id 
     AND content_hash = :content_hash 
     AND status = 'active' 
     AND deleted_at IS NULL;
   ```
3. If an active match is found, creation is aborted with `409 Conflict` (`MEMORY_DUPLICATE`), preventing duplicate noise.

---

## 3. Near-Duplicate & Semantic Overlap Detection

In addition to exact hashing, the system can perform semantic similarity checks (> 0.92 cosine similarity) against existing active memories. If a near-duplicate exists, the user is notified or prompted to update the existing record rather than creating fragmented fragments.

---

## 4. Retention Expiration & Deletion Cleanup

- Memories with an `expires_at` timestamp are automatically excluded from vector searches once `CURRENT_TIMESTAMP >= expires_at`.
- When a memory is deleted (soft-delete), its corresponding vector embedding in `ai.agent_memory_embeddings` is immediately deleted via `delete_by_memory_id`, guaranteeing that deleted memories never appear in search results.
