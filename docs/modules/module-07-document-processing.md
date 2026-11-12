# Module 07: Document Processing & Text Chunking

## 1. Overview
Module 07 built the asynchronous document parsing, text extraction, cleaning, and deterministic chunking pipelines.

## 2. Scope & Implementation
- **Multi-Format Extraction**: PyMuPDF for PDF extraction, python-docx for DOCX, and native UTF-8 streaming for TXT.
- **Deterministic Chunking**: Text chunking with sliding character/token windows (1200 characters, 150 overlap) with paragraph boundary preservation.
- **Background Worker**: BullMQ queue `opspilot-document-processing` managing extraction jobs with exponential backoff.
- **Metadata Tagging**: Each chunk is tagged with page numbers, byte offsets, and token counts (tiktoken).

## 3. Status
- **Status**: Complete (100% verified, 15 tests passing).
