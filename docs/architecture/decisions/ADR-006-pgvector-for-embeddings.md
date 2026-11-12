# ADR-006: pgvector Extension for Native Vector Storage

## Status
Accepted

## Context
Retrieval-Augmented Generation (RAG) requires storing 1536-dimensional vector embeddings and performing sub-second approximate nearest neighbor (ANN) searches alongside relational document metadata.

## Decision
We adopted `pgvector` natively inside PostgreSQL 16 instead of introducing dedicated vector databases like Pinecone, Weaviate, or Qdrant. Vector embeddings (`vector(1536)`) and text search vectors (`tsvector`) reside in `ai.document_chunks`.

## Consequences
- Single unified database engine for transactions, metadata, full-text search, and vector embeddings.
- Atomicity and transactional integrity during document deletions and re-indexing.
- Reduced operational overhead and cloud hosting costs.
