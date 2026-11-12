# Document Management REST API Reference

All document endpoints are mounted under `/api/v1/organizations/:organizationId/documents` and enforce active organization membership.

---

### 1. Upload Document

- **Endpoint**: `POST /api/v1/organizations/:organizationId/documents`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: Binary file (`.pdf`, `.docx`, `.txt`, `.md`, max 25MB).
  - `displayName` (optional, string, max 255 chars).
  - `description` (optional, string, max 5000 chars).
- **Responses**:
  - `201 Created`: Document created successfully.
  - `400 Bad Request`: `MISSING_FILE`, `FILE_TOO_LARGE`, or `INVALID_DOCUMENT_FILE`.
  - `403 Forbidden`: `FORBIDDEN_NOT_ORGANIZATION_MEMBER`.

---

### 2. List Documents

- **Endpoint**: `GET /api/v1/organizations/:organizationId/documents`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `search`: Case-insensitive substring match on `displayName` or `originalFilename`
  - `status`: `'active'` (default) or `'archived'`
  - `fileType`: `'pdf'`, `'docx'`, `'txt'`, `'md'`
  - `uploadedBy`: Filter by uploader user UUID
  - `sortBy`: `'created_at'`, `'updated_at'`, `'display_name'`, `'size_bytes'` (default: `'created_at'`)
  - `sortOrder`: `'asc'` or `'desc'` (default: `'desc'`)
- **Responses**:
  - `200 OK`: `{ success: true, data: { documents: [...], pagination: { ... } } }`

---

### 3. Get Document Details

- **Endpoint**: `GET /api/v1/organizations/:organizationId/documents/:documentId`
- **Responses**:
  - `200 OK`: Safe document metadata object (internal storage key omitted).
  - `404 Not Found`: `DOCUMENT_NOT_FOUND`.

---

### 4. Download Document Stream

- **Endpoint**: `GET /api/v1/organizations/:organizationId/documents/:documentId/download`
- **Security Headers Sent**:
  - `Content-Type`: Stored MIME type
  - `Content-Length`: Exact file size in bytes
  - `Content-Disposition`: `attachment; filename="safe.pdf"; filename*=UTF-8''safe.pdf`
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: private, no-store`
- **Responses**:
  - `200 OK`: Binary stream piped to client.
  - `400 Bad Request`: `DOCUMENT_ARCHIVED`.
  - `404 Not Found`: `DOCUMENT_NOT_FOUND`.

---

### 5. Update Metadata

- **Endpoint**: `PATCH /api/v1/organizations/:organizationId/documents/:documentId`
- **Body**:
  ```json
  {
    "displayName": "Updated Document Title",
    "description": "Updated description notes"
  }
  ```
- **Responses**:
  - `200 OK`: Updated document object.
  - `403 Forbidden`: Member cannot update documents uploaded by others.

---

### 6. Archive Document

- **Endpoint**: `POST /api/v1/organizations/:organizationId/documents/:documentId/archive`
- **Permissions**: Organization `owner` or `admin`.
- **Responses**:
  - `200 OK`: Document marked as `status: 'archived'`.
  - `403 Forbidden`: `FORBIDDEN` if caller is a regular member.

---

### 7. Restore Document

- **Endpoint**: `POST /api/v1/organizations/:organizationId/documents/:documentId/restore`
- **Permissions**: Organization `owner` or `admin`.
- **Responses**:
  - `200 OK`: Document marked as `status: 'active'`.
  - `403 Forbidden`: `FORBIDDEN` if caller is a regular member.
