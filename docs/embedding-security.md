# OpsPilot AI – Embedding Security Architecture

## 1. Zero Vector & Secret Leakage in Logs

To protect proprietary intellectual property and maintain enterprise data privacy:

- **No Raw Vector Logging**: Numerical embedding vectors (`float[1536]`) are strictly forbidden from application logs (`logger.info`, `console.log`, stdout).
- **Sanitized Telemetry Only**: Logs and API responses only record high-level counts (`totalChunks`, `embeddedChunks`, `dimensions`, `durationMs`).
- **No API Key Logging**: Provider keys (`OPENAI_API_KEY`) and internal service tokens (`AI_SERVICE_INTERNAL_TOKEN`) are never logged.

## 2. Service-to-Service Authentication

The internal Python endpoint `POST /internal/v1/embeddings/generate` is inaccessible to public internet clients:

- Protected by `verify_internal_service_token`.
- Enforces HTTP `Authorization: Bearer <token>`.
- Token comparison is performed in constant time using Python's `secrets.compare_digest` to prevent timing side-channel attacks.

## 3. RBAC & Organization Isolation

- **Status Query**: Any active member of an organization (`viewer`, `member`, `admin`, `owner`) can inspect embedding status telemetry.
- **Manual Reprocessing**: Only organization `admin` and `owner` roles can manually trigger embedding generation or reprocessing.
- **Archived Document Lockout**: Archived documents are strictly immutable; attempts to generate embeddings on archived documents are rejected with HTTP 400 `DOCUMENT_ARCHIVED`.
- **Database Multitenancy**: Vectors in `ai.document_chunk_embeddings` are strictly tagged with `organization_id` and indexed with composite B-Tree indexes for mandatory tenant-scoped filtering.
