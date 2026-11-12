# Document Chunking Engine

## 1. Overview

The chunking subsystem (`apps/ai-service/app/document_processing/chunking/splitter.py`) splits normalized document text into deterministic chunks optimized for semantic search and retrieval in RAG systems.

---

## 2. Chunking Parameters

| Parameter                 | Default Value          | Environment Variable      | Description                                                           |
| :------------------------ | :--------------------- | :------------------------ | :-------------------------------------------------------------------- |
| `CHUNK_SIZE`              | 1,200 chars            | `CHUNK_SIZE`              | Target character length for each text chunk.                          |
| `CHUNK_OVERLAP`           | 150 chars              | `CHUNK_OVERLAP`           | Number of overlapping characters preserved between contiguous chunks. |
| `MAX_CHUNKS_PER_DOCUMENT` | 10,000 chunks          | `MAX_CHUNKS_PER_DOCUMENT` | Safety threshold preventing runaway database ingestion.               |
| `PIPELINE_VERSION`        | `document-pipeline-v1` | `PIPELINE_VERSION`        | Version identifier stamped on all chunk records.                      |

---

## 3. Hierarchical Splitting Algorithm

The splitter scans candidate chunk boundaries and selects the most contextually appropriate break point within an overlap lookback window:

1. **Paragraph Breaks (`\n\n`)**: Highest priority; keeps semantic thoughts intact.
2. **Line Breaks (`\n`)**: Second priority; preserves list items and verse.
3. **Sentence Boundaries (`. `, `! `, `? `)**: Third priority; prevents splitting midway through a statement.
4. **Word Boundaries (` `)**: Fourth priority; avoids splitting words.
5. **Hard Character Cut**: Final fallback if no natural delimiter exists within the lookback window.

---

## 4. Metadata Preservation

Every generated chunk preserves full provenance:

- `chunk_index`: 0-based sequential ordering index within the document.
- `char_start` & `char_end`: Exact character coordinates in the normalized full document text.
- `page_start` & `page_end`: Physical page mapping (for paginated documents like PDF).
- `section_title`: Most specific active heading at the chunk's start offset (e.g., `# Architecture > ## Splitter`).
- `content_hash`: SHA-256 hash of the trimmed chunk content for deduplication and integrity checks.

---

## 5. Storage Schema

Chunks are persisted in PostgreSQL under the `ai` schema:

```sql
CREATE TABLE ai.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    document_id UUID NOT NULL,
    processing_run_id UUID NOT NULL REFERENCES ai.document_processing_runs(id) ON DELETE CASCADE,
    processing_generation INT NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    char_start INT NOT NULL,
    char_end INT NOT NULL,
    page_start INT,
    page_end INT,
    section_title VARCHAR(500),
    pipeline_version VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_generation_chunk UNIQUE (document_id, processing_generation, chunk_index)
);
```
