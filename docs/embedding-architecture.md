# OpsPilot AI – Embedding Generation Architecture

## 1. Architectural Overview

Module 08 establishes the vector embeddings subsystem for the OpsPilot AI platform. Building on top of the document processing pipeline (Module 07), the embedding subsystem transforms textual chunks into dense numerical vectors suitable for downstream semantic similarity search and Retrieval-Augmented Generation (RAG).

```mermaid
flowchart TD
    subgraph Storage["Document Persistence (Module 06)"]
        RawDoc["Raw Document File (S3 / Local)"]
    end

    subgraph Extraction["Extraction & Chunking (Module 07)"]
        ProcRun["Document Processing Worker"]
        DocChunks["ai.document_chunks (PostgreSQL)"]
    end

    subgraph EmbeddingQueue["Asynchronous Queue (BullMQ)"]
        EmbQueue["opspilot-document-embeddings"]
        EmbWorker["document-embedding.worker.ts"]
    end

    subgraph AIService["Python AI Microservice (FastAPI)"]
        Router["POST /internal/v1/embeddings/generate"]
        AuthCheck["verify_internal_service_token"]
        BatchService["EmbeddingBatchService"]
        TokenEst["TokenEstimator (tiktoken)"]
        Provider["EmbeddingProvider (OpenAI / Mock)"]
        ValService["EmbeddingValidationService"]
        Repo["EmbeddingRepository"]
    end

    subgraph VectorDB["PostgreSQL + pgvector (ai schema)"]
        ChunkEmbeddings["ai.document_chunk_embeddings (HNSW Index)"]
        AppDocuments["app.documents (embedding_status)"]
    end

    RawDoc --> ProcRun
    ProcRun --> DocChunks
    ProcRun -.->|"Auto Trigger on Completion"| EmbQueue
    EmbQueue --> EmbWorker
    EmbWorker -->|"HTTP Bearer Auth"| Router
    Router --> AuthCheck
    AuthCheck --> BatchService
    BatchService --> TokenEst
    BatchService --> Provider
    Provider --> ValService
    ValService --> Repo
    Repo --> ChunkEmbeddings
    EmbWorker -->|"Update State"| AppDocuments
```

## 2. Core Architectural Principles

1. **Separation of Concerns & Schema Ownership**:
   - `app` schema: Owned by Node.js API (`app.documents` tracking metadata, `embedding_status`, `embedding_generation`, and `embedded_chunk_count`).
   - `ai` schema: Owned by Python FastAPI (`ai.document_chunks`, `ai.document_processing_runs`, `ai.document_chunk_embeddings`).
2. **Embedding Space Partitioning**:
   - Every embedding vector is partitioned by an explicit `embedding_space` string formatted as `{provider}:{model}:{dimensions}` (e.g. `openai:text-embedding-3-small:1536`).
   - Prevents cosine distance comparisons between disparate models or dimension truncations.
3. **Idempotency & Cost Optimization**:
   - Embedding generation is deterministic and keyed on `chunk_id` + `embedding_space`.
   - The repository performs hash-based deduplication: chunks whose content hash already exists for the target embedding space are skipped from remote provider API calls, eliminating duplicate vectorization costs.
4. **Resilient Background Execution**:
   - Dedicated BullMQ queue (`opspilot-document-embeddings`) with deterministic generation-aware job IDs (`document-${docId}-emb-gen-${embGen}`).
   - Stale job protection: Jobs carrying obsolete `embedding_generation` numbers are detected and discarded gracefully without overwriting newer state.
5. **pgvector HNSW Indexing**:
   - Uses Hierarchical Navigable Small World (`vector_cosine_ops`, `m = 16`, `ef_construction = 64`) for sub-millisecond approximate nearest neighbor (ANN) retrieval with zero external vector database dependencies.
