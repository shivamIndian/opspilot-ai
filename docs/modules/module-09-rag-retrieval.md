# Module 09: RAG Retrieval Engine

## 1. Overview
Module 09 implemented the hybrid retrieval pipeline combining semantic vector similarity with lexical full-text search.

## 2. Scope & Implementation
- **Hybrid Search**: Reciprocal Rank Fusion (RRF) combining `pgvector` cosine similarity with PostgreSQL `tsvector` BM25 keyword matching.
- **Tenant & Lifecycle Filters**: Enforces active organization scoping and filters out archived or superseded document chunks.
- **Deduplication & Top-K**: Ranks and returns top-K unique context chunks with relevancy scores.
- **Retrieval API**: `POST /api/v1/organizations/:orgId/knowledge/search`.

## 3. Status
- **Status**: Complete (100% verified, 13 tests passing).
