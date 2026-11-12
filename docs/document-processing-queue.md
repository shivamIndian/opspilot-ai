# Document Processing Queue & Background Worker

## 1. Overview

OpsPilot AI utilizes **BullMQ** on top of Redis to orchestrate asynchronous document processing jobs. The background queue decouples document uploads from compute-intensive extraction and chunking tasks.

---

## 2. Queue Configuration

- **Queue Name**: `opspilot-document-processing`
- **Redis Connection**: Dedicated standalone `ioredis` connection configured with `maxRetriesPerRequest: null`, avoiding `BRPOPLPUSH` connection blocking.
- **Retry Strategy**: Exponential backoff (3 attempts, initial delay 2,000ms with multiplier).
- **Job Retention**:
  - Completed jobs: Retained up to 1 hour (max 500 records).
  - Failed jobs: Retained up to 1,000 records for diagnostic inspection.

---

## 3. Deterministic Job IDs & Idempotency

Jobs are assigned deterministic identifiers in the format:

```
document-${documentId}-generation-${processingGeneration}
```

If a job for a specific document and generation has already been enqueued, Redis suppresses duplicate job creation.

---

## 4. Background Worker Architecture

The worker process is defined in `apps/api/src/workers/document-processing.worker.ts`:

- **Concurrency**: Configurable via `DOCUMENT_PROCESSING_CONCURRENCY` (default: 3 concurrent jobs per worker).
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` signals to allow active jobs to finish or close clean connections.
- **Execution Script**:
  - Development: `npm run dev:worker` / `npm run worker:dev`
  - Production: `npm run start:worker` / `npm run worker:start`

---

## 5. Failure Handling & Retries

The worker distinguishes between retryable network/infrastructure errors and terminal validation/parsing failures:

| Error Category                 | HTTP Code | Retryable? | Behavior                                                                       |
| :----------------------------- | :-------- | :--------- | :----------------------------------------------------------------------------- |
| `NO_EXTRACTABLE_TEXT`          | 422       | No         | Throws `UnrecoverableError`; marks status `failed` in database; skips retries. |
| `ENCRYPTED_PDF_UNSUPPORTED`    | 422       | No         | Throws `UnrecoverableError`; marks status `failed` in database.                |
| `DOCUMENT_PAGE_LIMIT_EXCEEDED` | 422       | No         | Throws `UnrecoverableError`; marks status `failed` in database.                |
| `UNSUPPORTED_FILE_TYPE`        | 422       | No         | Throws `UnrecoverableError`; marks status `failed` in database.                |
| `INTERNAL_PROCESSING_ERROR`    | 500       | Yes        | Throws standard error; BullMQ schedules exponential retry.                     |
| Network / Connection Timeout   | 503 / Err | Yes        | Throws standard error; BullMQ schedules exponential retry.                     |
