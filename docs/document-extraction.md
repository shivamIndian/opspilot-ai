# Document Extraction Engine

## 1. Overview

The extraction subsystem is hosted inside the Python FastAPI AI microservice (`apps/ai-service/app/document_processing/extraction`). It safely ingests diverse binary formats, enforces memory and security limits, and outputs structured `ExtractedDocument` instances with page and section boundaries.

---

## 2. Supported Formats & Extraction Strategies

### PDF (`application/pdf`)

- **Engine**: PyMuPDF (`pymupdf>=1.24.0`).
- **Page Extraction**: Processes document page-by-page, preserving 1-based physical page indices and character offsets.
- **Safety Guards**:
  - `ENCRYPTED_PDF_UNSUPPORTED`: Rejects password-protected PDFs immediately.
  - `DOCUMENT_PAGE_LIMIT_EXCEEDED`: Rejects documents exceeding `MAX_DOCUMENT_PAGES=500`.
  - `NO_EXTRACTABLE_TEXT`: If all pages yield no alphanumeric text (e.g., scanned image PDFs), halts with clear failure code.
  - `MAX_EXTRACTED_CHARS`: Enforces safety limit of 5,000,000 characters.

### DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)

- **Engine**: `python-docx` with `defusedxml` protection.
- **Structure Extraction**:
  - Identifies heading paragraphs (`Heading 1`, `Heading 2`, `Heading 3`, etc.) to generate document section boundaries.
  - Formats tables row-by-row into readable pipe-delimited text (`Cell 1 | Cell 2`).
- **Safety Guards**:
  - ZIP decompression ratio protection prevents ZIP-bomb denial of service attacks.
  - Invalid ZIP structure rejection (`CORRUPTED_DOCUMENT`).

### Plain Text (`text/plain`)

- **Engine**: Safe UTF-8 decoding with fallback handling.
- **Safety Guards**:
  - Null-byte detection: Rejects binary files disguised as text with `CORRUPTED_DOCUMENT`.
  - Empty file detection: Rejects whitespace-only files with `NO_EXTRACTABLE_TEXT`.

### Markdown (`text/markdown`)

- **Engine**: Hierarchy-aware regex parser.
- **Structure Extraction**:
  - Detects ATX headings (`# Title`, `## Subheading`, `### Subsection`) to build nested section trees.
  - Preserves fenced code blocks (` ```python ... ``` `), unordered/ordered lists, and Markdown tables.

---

## 3. Text Normalization Pipeline

Raw extracted text passes through `TextNormalizer` (`normalizer.py`) before chunking:

1. **Unicode NFC Canonical Normalization**: Decomposed characters (e.g., `e\u0301`) are combined into canonical precomposed characters (`é`).
2. **Line Ending Canonicalization**: All `\r\n` and isolated `\r` occurrences are converted to standard Unix `\n`.
3. **Control Character Stripping**: Strips ASCII non-printable control characters `\x00-\x08`, `\x0B-\x0C`, `\x0E-\x1F`, and `\x7F-\x9F` while preserving meaningful tabs (`\t`) and newlines (`\n`).
4. **Whitespace Cleaning**: Trims trailing whitespace from individual lines and collapses excessive blank lines (>2 newlines) into canonical paragraph breaks (`\n\n`).
