# Document Processing API Reference

## 1. External Organization APIs (Node.js Express)

### Get Document Processing Status

Retrieves current processing telemetry, generation counter, extracted page/chunk counts, and error status for a specific document.

- **Endpoint**: `GET /api/v1/organizations/:organizationId/documents/:documentId/processing-status`
- **Authentication**: Bearer JWT (Organization Member)
- **Rate Limit**: Standard authenticated rate limit
- **Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "processing": {
      "documentId": "11111111-1111-4111-8111-111111111111",
      "status": "completed",
      "generation": 1,
      "pageCount": 12,
      "extractedCharCount": 18450,
      "chunkCount": 16,
      "pipelineVersion": "document-pipeline-v1",
      "errorCode": null,
      "attempts": 1,
      "startedAt": "2026-11-03T10:00:01.000Z",
      "processedAt": "2026-11-03T10:00:03.450Z",
      "updatedAt": "2026-11-03T10:00:03.450Z"
    }
  }
}
```

---

### Request Document Reprocessing

Manually triggers re-extraction and re-chunking for an active document with an incremented generation counter.

- **Endpoint**: `POST /api/v1/organizations/:organizationId/documents/:documentId/process`
- **Authentication**: Bearer JWT (Organization Owner or Admin only)
- **Response**: `202 Accepted`

```json
{
  "success": true,
  "data": {
    "processing": {
      "documentId": "11111111-1111-4111-8111-111111111111",
      "status": "queued",
      "generation": 2,
      "pageCount": null,
      "extractedCharCount": null,
      "chunkCount": 0,
      "pipelineVersion": "document-pipeline-v1",
      "errorCode": null,
      "attempts": 0,
      "startedAt": null,
      "processedAt": null,
      "updatedAt": "2026-11-03T10:15:00.000Z"
    }
  }
}
```

- **Error Codes**:
  - `400 Bad Request`: `DOCUMENT_ARCHIVED` (archived documents cannot be reprocessed).
  - `403 Forbidden`: `FORBIDDEN` (user is not an admin or owner).
  - `404 Not Found`: `DOCUMENT_NOT_FOUND` (document does not exist).
  - `409 Conflict`: `DOCUMENT_PROCESSING_IN_PROGRESS` (document is actively running).
  - `503 Service Unavailable`: `QUEUE_SCHEDULING_FAILED` (Redis unavailable).

---

## 2. Internal Microservice API (Python FastAPI)

### Process Document Binary

Internal endpoint called exclusively by Node.js background workers to extract, normalize, and chunk document text.

- **Endpoint**: `POST /internal/v1/documents/process`
- **Authentication**: `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Raw binary file stream
  - `organization_id`: UUID
  - `document_id`: UUID
  - `processing_generation`: Integer
  - `source_checksum`: SHA-256 string
  - `file_extension`: String (`pdf`, `docx`, `txt`, `md`)
  - `pipeline_version`: String (`document-pipeline-v1`)
- **Response**: `200 OK`

```json
{
  "success": true,
  "processing_run_id": "33333333-3333-3333-3333-333333333333",
  "organization_id": "22222222-2222-2222-2222-222222222222",
  "document_id": "11111111-1111-1111-1111-111111111111",
  "processing_generation": 1,
  "status": "completed",
  "page_count": 12,
  "extracted_char_count": 18450,
  "chunk_count": 16,
  "pipeline_version": "document-pipeline-v1",
  "error_code": null
}
```
