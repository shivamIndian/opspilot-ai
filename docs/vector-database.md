# OpsPilot AI – Vector Database Architecture (PostgreSQL + pgvector)

## 1. Storage Schema

Vector embeddings are persisted in the `ai` schema within table `ai.document_chunk_embeddings`:

```sql
CREATE TABLE ai.document_chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES ai.document_chunks(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    embedding_space VARCHAR(128) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    dimensions INTEGER NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_chunk_embedding_space UNIQUE (chunk_id, embedding_space)
);
```

## 2. Indexing Strategy

### HNSW Approximate Nearest Neighbor Index

Hierarchical Navigable Small World (HNSW) indexing delivers high-recall similarity retrieval with logarithmic query latency:

```sql
CREATE INDEX idx_document_chunk_embeddings_hnsw ON ai.document_chunk_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

- **Distance Metric**: `vector_cosine_ops` (Cosine distance).
- **`m = 16`**: Number of bidirectional links established per node at each layer (balances recall and indexing memory).
- **`ef_construction = 64`**: Size of dynamic candidate list evaluated during index construction.

### B-Tree Composite Indexes

To guarantee strict multi-tenant isolation and fast lookup during document updates or deletion:

```sql
-- Fast tenant + document queries
CREATE INDEX idx_document_chunk_embeddings_org_doc ON ai.document_chunk_embeddings(organization_id, document_id);

-- Space-specific lookup
CREATE INDEX idx_document_chunk_embeddings_space ON ai.document_chunk_embeddings(embedding_space);
```

## 3. Multi-Tenant Query Isolation Guarantee

PostgreSQL HNSW indexes do not enforce tenant filtering natively during vector search traversal.
Therefore, all downstream search queries (Module 09+) are strictly enforced to include:

```sql
WHERE organization_id = :org_id
  AND embedding_space = :embedding_space
ORDER BY embedding <=> :query_vector
LIMIT :top_k;
```
