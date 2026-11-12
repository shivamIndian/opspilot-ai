# AI Citation Validation & Grounding Strategy

## Overview

In enterprise operations, AI answers without source traceability cannot be trusted. OpsPilot AI implements a **Two-Tier Citation Validation Strategy** to ensure that every citation corresponds to real, authorized document passages.

---

## 1. Stable Source ID Assignment

Before invoking the LLM, the Node.js backend normalizes the retrieved chunks and assigns deterministic, stable source identifiers:

$$\{ \text{Chunk}_1 \to \text{S1}, \quad \text{Chunk}_2 \to \text{S2}, \quad \dots, \quad \text{Chunk}_n \to \text{S}n \}$$

These identifiers are supplied inside the prompt alongside document titles, page numbers, and section headers:

```
--- SOURCE [S1] ---
Document: Employee Handbook.pdf
Location: Page 12 | Section: Account Management
Content:
All password reset requests require secondary verification...
```

---

## 2. Citation Sanitization & Hallucination Defense

Language models occasionally cite non-existent identifiers (e.g. `S99` or arbitrary strings). The `CitationValidator` (`app/llm/services/citation_validator.py`) inspects the model's `cited_source_ids` array against the verified candidate set:

```python
valid_id_set = {s.source_id for s in available_sources}
sanitized_ids = []
unknown_ids = []

for cid in raw_answer.cited_source_ids:
    if cid in valid_id_set:
        sanitized_ids.append(cid)
    else:
        unknown_ids.append(cid)

if unknown_ids:
    limitations.append(
        f"Removed {len(unknown_ids)} unsupported source citations ({', '.join(unknown_ids)}) "
        f"that were not present in authorized reference documentation."
    )
```

---

## 3. Authoritative Citation Hydration

The client never receives raw text chunks alone. Instead, the Node.js backend hydrates each valid source ID into a rich citation object:

```json
{
  "sourceId": "S1",
  "documentId": "44444444-4444-4444-8444-444444444444",
  "chunkId": "11111111-2222-3333-4444-555555555555",
  "documentName": "Employee Handbook",
  "originalFilename": "handbook.pdf",
  "fileExtension": "pdf",
  "pageStart": 12,
  "pageEnd": 12,
  "sectionTitle": "Account Management",
  "charStart": 1420,
  "charEnd": 1940,
  "relevanceScore": 0.832
}
```

### Zero-Fabrication Rule

If page numbers or section titles are absent in the source document (e.g. unpaginated plain text files), the system explicitly returns `null`. Under no circumstances are synthetic page numbers or headings invented.
