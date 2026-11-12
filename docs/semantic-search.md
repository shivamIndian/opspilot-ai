# OpsPilot AI – Semantic Vector Search

## 1. Vector Search Implementation

Semantic search matches natural-language concepts rather than exact tokens by comparing dense 1536-dimensional vector representations.

### pgvector Cosine Distance Query

The query computes cosine distance between the chunk vector and the query vector using the `<=>` operator:

```sql
SELECT
    ce.chunk_id,
    ce.document_id,
    ce.organization_id,
    ce.processing_run_id,
    pr.processing_generation,
    c.chunk_index,
    c.content,
    c.char_start,
    c.char_end,
    c.page_start,
    c.page_end,
    c.section_title,
    c.metadata AS chunk_metadata,
    ce.embedding <=> :query_vector AS distance
FROM ai.document_chunk_embeddings ce
JOIN ai.document_chunks c ON c.id = ce.chunk_id
JOIN ai.document_processing_runs pr ON pr.id = ce.processing_run_id
WHERE ce.organization_id = :organization_id
  AND ce.embedding_space = :embedding_space
ORDER BY distance ASC
LIMIT :candidate_limit;
```

## 2. Cosine Similarity Calculation

PostgreSQL `pgvector` returns the cosine distance $d \in [0, 2]$:
$$d = 1.0 - \frac{u \cdot v}{\|u\|_2 \|v\|_2}$$

OpsPilot AI converts this distance to normalized cosine similarity:
$$\text{similarity} = \max(0.0, \min(1.0, 1.0 - d))$$

> [!NOTE]
> Cosine similarity indicates geometric proximity in high-dimensional embedding space. It is **not** a calibrated confidence probability and is never presented to end-users as an accuracy percentage.

## 3. Embedding Space Isolation

To prevent cross-model comparisons:

- Searches are explicitly scoped by `embedding_space`, formatted as `{provider}:{model}:{dimensions}` (e.g. `openai:text-embedding-3-small:1536`).
- Queries generated with one model are never compared against chunk vectors created by another model.
