# ADR-003: Python 3.11 & FastAPI Cognitive Microservice

## Status
Accepted

## Context
AI orchestration requires deep integration with vector libraries, document parsing tools (PyMuPDF, python-docx), LangGraph cognitive state graphs, tokenizers (tiktoken), and scientific evaluation frameworks. The Python ecosystem is the gold standard for generative AI engineering.

## Decision
We isolated all AI, extraction, vector indexing, retrieval, and LangGraph workflow orchestration into a dedicated Python 3.11 microservice powered by FastAPI, Pydantic v2, and SQLAlchemy 2 (asyncpg).

## Consequences
- Clean separation between core transaction processing (Node.js) and CPU/memory-intensive cognitive tasks (Python).
- LLM provider API keys remain strictly inside the AI service boundary.
- Python service is isolated in private network subnets without direct internet ingress.
