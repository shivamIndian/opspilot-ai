# OpsPilot AI – Embedding API Reference

## 1. External Node.js REST Endpoints

### Get Document Embedding Telemetry Status

Retrieves current embedding state, model, dimensions, and chunk counts.

- **Method**: `GET`
- **Path**: `/api/v1/organizations/:organizationId/documents/:documentId/embeddings/status`
- **Authorization**: Bearer JWT (Organization Member, Admin, or Owner)
- **Response `200 OK`**:

```json
{
  "success": true,
  "data": {
    "embedding": {
      "documentId": "4a76ef50-4fc1-46e2-9ba6-39cb0e1ad7cb",
      "status": "completed",
      "generation": 1,
      "provider": "openai",
      "model": "text-embedding-3-small",
      "dimensions": 1536,
      "embeddedChunkCount": 12,
      "errorCode": null,
      "startedAt": "2026-11-03T16:00:00.000Z",
      "embeddedAt": "2026-11-03T16:00:02.150Z",
      "updatedAt": "2026-11-03T16:00:02.160Z"
    }
  }
}
```

---

### Trigger Manual Embedding Generation / Reprocessing

Initiates embedding generation or re-generation for an active, extracted document.

- **Method**: `POST`
- **Path**: `/api/v1/organizations/:organizationId/documents/:documentId/embeddings/reprocess`
- **Authorization**: Bearer JWT (Organization Admin or Owner)
- **Response `202 Accepted`**:

```json
{
  "success": true,
  "data": {
    "embedding": {
      "documentId": "4a76ef50-4fc1-46e2-9ba6-39cb0e1ad7cb",
      "status": "queued",
      "generation": 2,
      "provider": "openai",
      "model": "text-embedding-3-small",
      "dimensions": 1536,
      "embeddedChunkCount": 0,
      "errorCode": null,
      "startedAt": null,
      "embeddedAt": null,
      "updatedAt": "2026-11-03T16:05:00.000Z"
    }
  }
}
```

- **Error Responses**:
  - `400 Bad Request`: `DOCUMENT_ARCHIVED` or `DOCUMENT_NOT_EXTRACTED`
  - `403 Forbidden`: `FORBIDDEN` (Insufficient role)
  - `404 Not Found`: `DOCUMENT_NOT_FOUND`

---

## 2. Internal AI Service Endpoint

### Generate Document Embeddings (Service-to-Service)

Invoked by Node.js BullMQ workers to vectorize chunk content.

- **Method**: `POST`
- **Path**: `/internal/v1/embeddings/generate`
- **Headers**:
  - `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>`
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "organization_id": "99999999-9999-4999-8999-999999999991",
  "document_id": "4a76ef50-4fc1-46e2-9ba6-39cb0e1ad7cb",
  "processing_generation": 1,
  "embedding_generation": 1,
  "provider": "openai",
  "model": "text-embedding-3-small",
  "dimensions": 1536
}
```

- **Response `200 OK`**:

```json
{
  "success": true,
  "data": {
    "organization_id": "99999999-9999-4999-8999-999999999991",
    "document_id": "4a76ef50-4fc1-46e2-9ba6-39cb0e1ad7cb",
    "embedding_generation": 1,
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536,
    "embedding_space": "openai:text-embedding-3-small:1536",
    "total_chunks": 12,
    "embedded_chunks": 12,
    "failed_chunks": 0,
    "status": "completed",
    "duration_ms": 340
  }
}
```

- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid internal token
  - `422 Unprocessable Content`: Non-retryable error (e.g. `DOCUMENT_CHUNKS_NOT_FOUND`, `EMBEDDING_DIMENSION_MISMATCH`)
  - `500 Internal Server Error`: Retryable failure (e.g. `EMBEDDING_RATE_LIMITED`, `EMBEDDING_TIMEOUT`)
