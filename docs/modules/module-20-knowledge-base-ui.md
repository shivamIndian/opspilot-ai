# Module 20: OpsPilot AI – Enterprise Knowledge Base UI & Diagnostics

## 1. Overview & System Mission

Module 20 implements the unified **Enterprise Knowledge Base UI** for OpsPilot AI. It consolidates document catalog management, hybrid semantic RAG retrieval, grounded answer generation with verifiable source citations, vector index health monitoring, and deep document-level pipeline diagnostics into a cohesive, production-grade workspace experience.

The Knowledge Base is the central intelligence foundation of OpsPilot AI:
- Organizations upload SOPs, runbooks, technical manuals, and policies (`.pdf`, `.docx`, `.txt`, `.md`).
- Files are parsed, chunked with recursive token splitting, and embedded via OpenAI (`text-embedding-3-small`, 1536-dim) into PostgreSQL `pgvector`.
- Operators and AI agents query this knowledge base using reciprocal rank fusion (RRF) hybrid retrieval, grounding autonomous decisions in verified company facts.
- Telemetry dashboards provide real-time diagnostic visibility into ingestion queues, vector database health, and one-click failure remediation.

---

## 2. Architecture & Information Flow

```
                                      +------------------------------------+
                                      |     React 18 Knowledge Hub UI      |
                                      |  (/organizations/:orgId/knowledge) |
                                      +-----------------+------------------+
                                                        |
                                                        | Authenticated HTTP (JWT + Tenant ID)
                                                        v
                                      +------------------------------------+
                                      |     Node.js Express API Server     |
                                      |    (Documents & Knowledge GW)      |
                                      +--------+------------------+--------+
                                               |                  |
                       Document Metadata &     |                  | Hybrid RAG Search & LLM Grounding
                       Storage Stream Actions  |                  | (Direct AI Microservice Calls)
                                               v                  v
                               +-------------------+      +-------------------+
                               | PostgreSQL 16 DB  |      | Python AI Service |
                               |   (Schema: app)   |      |  (Schema: ai)     |
                               |                   |      |                   |
                               | app.documents     |      | ai.document_chunks|
                               | app.document_     |      | (1536d pgvector)  |
                               |   embeddings      |      +-------------------+
                               +-------------------+
```

---

## 3. Implemented Components & Structure

Located in `apps/web/src/features/knowledge/` and `apps/web/src/features/documents/`:

### A. Master Knowledge Base Hub (`KnowledgeBasePage.tsx`)
Mounted at `/organizations/:organizationId/knowledge` (with query sync `?tab=documents|search|health`):

1. **Tab 1: Documents Catalog (`documents`)**:
   - Aggregate KPI strip: Total Documents, Active in RAG, Extracted Chunks, Total Storage footprint.
   - Comprehensive Document Filters: Natural-language filter, status selector (active vs. archived), format selector (`pdf`, `docx`, `txt`, `md`), sort by date/size/name.
   - Interactive Table (`DocumentTable`): File icons, MIME types, processing status badges, embedding status badges, relative timestamps, and action menus (Inspect details, Download, Edit metadata, Reprocess parsing, Reprocess embeddings, Archive / Restore).
   - Drag-and-drop Upload Modal (`DocumentUploadDialog`): File size constraints, extension validation, progress bar, and metadata tagging.

2. **Tab 2: Semantic Search & Ask AI (`search`)**:
   - Unified query composer (`KnowledgeSearchBar`) with natural-language input, "Ask AI", and "Search" triggers.
   - Retrieval Mode Selector (`RetrievalModeSelector`):
     - **Hybrid Fusion (RRF)**: Combines dense cosine similarity with sparse BM25 keyword matching.
     - **Semantic Vector**: Pure dense cosine distance (`<=>`) via pgvector.
     - **Full-Text Keyword**: PostgreSQL `ts_rank_cd` inverted text search.
   - Search result cards (`SearchResultCard`): Match score percentages, chunk text snippet, source file badges, and rank indicators.
   - Grounded LLM Answering Card (`GeneratedAnswerCard`): Synthesized answers, verifiable citation pills, confidence levels, and copy-to-clipboard functionality.
   - Context Preview Drawer (`ContextPreviewModal`): Inspects exact prompt-grounding chunks fed into the LLM.

3. **Tab 3: Vector Index & Engine Health (`health`)**:
   - `VectorIndexHealthPanel`:
     - Vector Engine telemetry: 1,536-dimensional OpenAI embeddings, pgvector HNSW index status, distance metric.
     - Ingestion Pipeline health: Documents completed, processing/queued, pending, and failed.
     - Worker queue monitoring: BullMQ background workers (`document-processing-worker`, `document-embedding-worker`).
     - Automated Remediation Queue: Lists failed documents with error codes and provides one-click retry actions for parsing and vector embeddings.

### B. Dedicated Document Detail View (`DocumentDetailPage.tsx`)
Mounted at `/organizations/:organizationId/knowledge/documents/:documentId`:
- Breadcrumb navigation: `Knowledge Base > Documents > [Document Name]`.
- Metadata Card: Original filename, display name, description, MIME type, file size, SHA-256 cryptographic checksum with one-click copy, uploader name & email.
- Toolbar Actions: Secure binary download, metadata editing, manual reprocessing of parsing, manual reprocessing of vector embeddings, and archive/restore toggling.
- Stage 1 Panel (`ProcessingDetailsPanel`): AI parser engine version, page count, extracted character count, total chunk count, processing timeline, and error details if failed.
- Stage 2 Panel (`EmbeddingDetailsPanel`): Vector embedding status, embedding model (`text-embedding-3-small`), dimension verification (1536), embedded chunk counter, and timestamp.

---

## 4. Navigation & Route Hierarchy

| Path | Element | Purpose |
|---|---|---|
| `/organizations/:orgId/knowledge` | `<KnowledgeBasePage />` | Unified Knowledge Base Hub (defaults to Documents tab). |
| `/organizations/:orgId/knowledge?tab=search` | `<KnowledgeBasePage />` | Direct link to Semantic Search & Ask AI. |
| `/organizations/:orgId/knowledge?tab=health` | `<KnowledgeBasePage />` | Direct link to Vector Index & Processing Health telemetry. |
| `/organizations/:orgId/knowledge/documents/:docId` | `<DocumentDetailPage />` | Full specifications and diagnostic view for a single document. |
| `/organizations/:orgId/documents` | `<KnowledgeBasePage defaultTab="documents" />` | Backward-compatible route to documents tab. |
| `/organizations/:orgId/documents/:docId` | `<DocumentDetailPage />` | Backward-compatible route to document details. |

---

## 5. Security & Tenant Isolation

- **Role-Based Controls**: Uploading, editing metadata, archiving, restoring, and reprocessing require `documents:write` / `documents:delete` or `owner`/`admin` role. Standard members can read and search documents.
- **Tenant Isolation**: Every database query explicitly filters `WHERE organization_id = $1`. Cross-tenant retrieval and download leakage are strictly prevented.
- **Tamper-Proof File Integrity**: Every document computes and verifies a SHA-256 hash upon ingestion.

---

## 6. Testing & Quality Gates

- **Frontend Test Suite** (`apps/web/tests/knowledge-base.test.tsx`): 5/5 passing.
  - Unified hub rendering with KPI summary cards.
  - Tab switching between Documents, Semantic Search, and Health.
  - Hybrid search query execution and result cards rendering.
  - Ingestion & vector database diagnostics display.
  - Document detail page rendering with SHA-256 fingerprint and download action.
- **Full Web Workspace Suite**: 58/58 passing tests.
- **Production Build Verification**: `vite build` completed cleanly in 7.66s with zero errors.
