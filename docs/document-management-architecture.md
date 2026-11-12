# Document Management System Architecture

## 1. Overview & Business Purpose

The OpsPilot AI Document Management System (Module 06) serves as the secure, multi-tenant file foundation for enterprise knowledge management and support automation. It provides private, organization-isolated storage and metadata management for organizational documents (`.pdf`, `.docx`, `.txt`, `.md`) which will later be ingested by downstream RAG pipelines in Module 07.

## 2. Core Architectural Principles

- **Zero-Trust Organization Isolation**: Every document is strictly bound to an `organization_id`. Cross-tenant retrieval, download, or manipulation is rejected at both the middleware and database layers.
- **Physical vs. Public Separation**: Uploaded document binaries are strictly stored outside web-accessible public directories in an isolated private directory (`.data/opspilot-uploads/<orgId>/<uuid>.<ext>`) with an unguessable UUID storage key.
- **Deep Signature Verification (Magic Bytes)**: MIME types declared by HTTP clients are treated as untrusted hints. File headers are checked for genuine binary signatures (`%PDF-`, ZIP OOXML structure, UTF-8 text without null bytes) before disk storage.
- **Atomic Persistence & Compensation**: If database metadata insertion fails, the physical file is immediately purged to eliminate orphaned binary artifacts.
- **Streaming Transfer**: Uploads and downloads are processed as binary streams rather than buffered in RAM, preserving memory safety and preventing node heap exhaustion.

## 3. High-Level Architecture Diagram

```mermaid
flowchart TD
    Client["React Frontend (Vite)"] -->|Multipart Upload| API["Node.js Express API"]
    API -->|Authenticate JWT| Auth["Auth Middleware"]
    API -->|Validate Membership| Context["Org Context Guard"]
    API -->|Magic Byte Signature Check| Val["Document Validation Service"]

    Val -->|Valid| Storage["Storage Abstraction (LocalStorageProvider)"]
    Storage -->|Write File| Disk[".data/opspilot-uploads/:orgId/uuid.ext"]

    API -->|Insert Metadata (Transaction)| PG[("PostgreSQL app.documents")]
    API -->|Audit Event| Audit[("app.organization_audit_logs")]

    subgraph Future Module 07
        AI["FastAPI AI Service"] -.->|Authorized Chunking & Embedding| Storage
    end
```

## 4. Entity Lifecycle & States

1. **Active**: The document is accessible for search, listing, metadata updates, and streaming downloads.
2. **Archived**: Soft-archived state (`archived_at` populated, status = `archived`). Archived documents are hidden by default from active listings, and direct download attempts return HTTP 400 (`DOCUMENT_ARCHIVED`). Only organization owners and admins can restore archived documents.
