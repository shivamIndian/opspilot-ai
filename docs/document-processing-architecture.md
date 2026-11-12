# Document Processing Pipeline Architecture

## 1. Overview

The OpsPilot AI Document Processing Pipeline transforms raw enterprise documents (PDF, DOCX, TXT, MD) into clean, normalized, hierarchically split text chunks ready for vector embeddings in future modules.

The pipeline is completely asynchronous and fault-tolerant, decoupling synchronous upload responses from computation-intensive extraction and chunking workflows.

```
+--------------------------------------------------------------------------------------------------------+
|                                        OpsPilot AI Monorepo                                            |
|                                                                                                        |
|  +---------------------+                                                                               |
|  |   React Frontend    |                                                                               |
|  +----------+----------+                                                                               |
|             | HTTP Upload / Polling                                                                    |
|             v                                                                                          |
|  +--------------------------------------------------------------------------------------------------+  |
|  | Node.js Express Main Backend (@opspilot/api)                                                     |  |
|  |                                                                                                  |  |
|  |  [Document Upload Service]                                                                       |  |
|  |          | (1) Store binary to local/S3 storage                                                  |  |
|  |          | (2) Insert metadata into app.documents (status: active, processing_status: queued)     |  |
|  |          v                                                                                       |  |
|  |  [BullMQ Queue Producer: opspilot-document-processing]                                            |  |
|  |          | Job ID: document-${id}-generation-${gen}                                              |  |
|  +----------|---------------------------------------------------------------------------------------+  |
|             |                                                                                          |
|             v Enqueue Job                                                                              |
|  +---------------------+                                                                               |
|  | Redis Queue (BullMQ)|                                                                               |
|  +----------+----------+                                                                               |
|             | Dequeue Job                                                                              |
|             v                                                                                          |
|  +--------------------------------------------------------------------------------------------------+  |
|  | Node.js Processing Worker (@opspilot/api - worker.ts)                                            |  |
|  |                                                                                                  |  |
|  |  (1) Checks current document generation (skips if superseded)                                    |  |
|  |  (2) Updates app.documents (processing_status: 'processing')                                     |  |
|  |  (3) Streams binary file from storage provider                                                   |  |
|  |  (4) Calls Python AI Service with Bearer token                                                   |  |
|  +----------|---------------------------------------------------------------------------------------+  |
|             | POST /internal/v1/documents/process (Multipart form + binary stream)                      |
|             v                                                                                          |
|  +--------------------------------------------------------------------------------------------------+  |
|  | Python FastAPI AI Microservice (apps/ai-service)                                                 |  |
|  |                                                                                                  |  |
|  |  (1) Authenticate internal token via constant-time comparison                                    |  |
|  |  (2) Format-specific text extraction (PyMuPDF, python-docx, etc.)                                 |  |
|  |  (3) Text normalization (Unicode NFC, CRLF, control char stripping)                              |  |
|  |  (4) Hierarchical text chunking (1200 char window, 150 char overlap)                              |  |
|  |  (5) Atomically write run & chunks to PostgreSQL `ai` schema                                      |  |
|  |  (6) Return telemetry (status, chunk_count, page_count, extracted_char_count)                     |  |
|  +----------|---------------------------------------------------------------------------------------+  |
|             |                                                                                          |
|             v                                                                                          |
|  +--------------------------------------------------------------------------------------------------+  |
|  | PostgreSQL Database                                                                              |  |
|  |                                                                                                  |  |
|  |  Schema `app`:                                                                                   |  |
|  |    - `app.documents`: processing_status, page_count, chunk_count, processing_generation          |  |
|  |  Schema `ai`:                                                                                    |  |
|  |    - `ai.document_processing_runs`: historical execution runs & audit metrics                    |  |
|  |    - `ai.document_chunks`: persisted text chunks with page, section, offsets, SHA-256           |  |
|  +--------------------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------------+
```

---

## 2. Processing Lifecycle States

A document moves through the following finite state machine:

| State        | Description                                                                                          | Transition Triggers                                     |
| :----------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| `pending`    | Document metadata recorded, file awaiting queue assignment.                                          | Initial document record creation.                       |
| `queued`     | Background job enqueued in BullMQ; waiting for available worker slot.                                | Post-upload commit or manual reprocessing trigger.      |
| `processing` | Background worker dequeued job, streamed binary to Python AI microservice.                           | Worker job start.                                       |
| `completed`  | Text extracted, normalized, chunked, and persisted to `ai.document_chunks`.                          | Successful response from Python service.                |
| `failed`     | Processing halted due to unextractable text, unsupported encryption, limits, or unrecoverable error. | Extractor error, limit violation, or exhausted retries. |

---

## 3. Concurrency & Generation Isolation

To prevent race conditions during rapid uploads or re-indexing operations:

1. **Processing Generation (`processing_generation`)**:
   - Every document maintains an integer generation counter starting at `1`.
   - Reprocessing increments the generation counter atomically via `incrementGenerationAndSetQueued`.
   - BullMQ assigns a deterministic Job ID: `document-${documentId}-generation-${generation}`.
2. **Stale Generation Guard**:
   - If a background worker picks up a job whose generation is lower than the current generation in `app.documents`, the worker logs an info message and skips execution (`SUPERSEDED_GENERATION`).
3. **Optimistic Locking**:
   - All status updates include `WHERE organization_id = $1 AND id = $2 AND processing_generation = $3`. Stale workers cannot overwrite results from newer generations.
