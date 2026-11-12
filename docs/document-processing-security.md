# Document Processing Security & Tenant Isolation

## 1. Overview

Document processing involves untrusted enterprise file input and internal communication between microservices. OpsPilot AI implements defense-in-depth principles across authentication, tenant isolation, and parsing sandboxes.

---

## 2. Internal Service Authentication

All communication between Node.js Express workers and the Python FastAPI AI microservice occurs over an internal REST API authenticated with a pre-shared bearer token (`AI_SERVICE_INTERNAL_TOKEN`):

```http
POST /internal/v1/documents/process HTTP/1.1
Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>
```

### Security Measures:

- **Constant-Time Verification**: Validated using Python's `secrets.compare_digest()` to eliminate timing attack vectors.
- **Header Parsing**: Rejects missing or malformed `Authorization` headers with `401 Unauthorized` before processing any file streams.
- **Token Masking**: Never logged in console outputs, audit events, or API error payloads.

---

## 3. Strict Tenant Isolation

- **Query-Level Enforcement**: Every database operation across `app.documents`, `ai.document_processing_runs`, and `ai.document_chunks` scopes queries by `organization_id`.
- **Pre-Execution Check**: Before dequeued jobs stream files from storage, the worker executes `documentRepository.findById(organizationId, documentId)` to verify organization ownership.
- **RBAC Guard**:
  - Processing status queries (`GET .../processing-status`): Permitted for all active organization members.
  - Manual reprocessing requests (`POST .../process`): Restricted to organization Owners and Admins only.

---

## 4. Parser Hardening & Resource Limits

| Threat                            | Defense Mechanism                                                                                                                               |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ZIP Bomb / Decompression Bomb** | `DocxExtractor` verifies compressed vs. decompressed payload size ratio using `defusedxml` before unpacking.                                    |
| **Binary Disguise**               | `TextExtractor` scans text buffers for null bytes (`\x00`) and halts with `CORRUPTED_DOCUMENT`.                                                 |
| **Password Attacks**              | `PdfExtractor` rejects password-protected PDFs immediately with `ENCRYPTED_PDF_UNSUPPORTED`.                                                    |
| **Memory Exhaustion**             | Strict page limits (`MAX_DOCUMENT_PAGES=500`), char limits (`MAX_EXTRACTED_CHARS=5000000`), and chunk limits (`MAX_CHUNKS_PER_DOCUMENT=10000`). |
| **Stream Leaks**                  | File binary streams are read directly from storage provider and closed in `finally` blocks.                                                     |
