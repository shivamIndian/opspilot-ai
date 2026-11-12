# Module 08: Embeddings Generation & Vector Database

## 1. Overview
Module 08 integrated OpenAI vector embeddings generation and storage in PostgreSQL using the `pgvector` extension.

## 2. Scope & Implementation
- **Vector Storage**: `ai.document_chunks` table with `vector(1536)` columns and HNSW vector indexing (`vector_cosine_ops`).
- **Embedding Pipeline**: Asynchronous BullMQ background worker `opspilot-document-embeddings` batching chunks to OpenAI `text-embedding-3-small`.
- **Deduplication & Idempotency**: Generation counters preventing race conditions and stale chunk superseding.
- **Error Handling**: Distinct handling for retryable rate limits (429) vs. unrecoverable schema mismatches (422).

## 3. Status
- **Status**: Complete (100% verified, 31 tests passing across Node and Python).
