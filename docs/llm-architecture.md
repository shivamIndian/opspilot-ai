# LLM Integration & Intelligence Engine Architecture

## Overview

Module 10 establishes the **LLM Integration & Intelligence Engine** for OpsPilot AI. It bridges the authoritative Retrieval-Augmented Generation (RAG) retrieval engine (Module 09) with cognitive language models, synthesizing reliable, contextual, evidence-grounded answers based strictly on authorized corporate documents.

The architecture enforces a strict physical and logical boundary between high-throughput multi-tenant business operations (Node.js Express) and AI generation workflows (Python FastAPI).

---

## 1. System Topology & Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser (React 18)
    participant API as Node.js Core API (:4000)
    participant DB as PostgreSQL (app schema)
    participant AI as Python AI Microservice (:8000)
    participant AIDB as PostgreSQL (ai schema + pgvector)
    participant LLM as OpenAI / LLM Provider

    User->>API: POST /api/v1/organizations/:id/knowledge/answer
    Note over API: Authenticate JWT & Verify Org Membership
    API->>AI: POST /internal/v1/retrieval/search (Service Token)
    AI->>AIDB: Cosine <=> (HNSW) & Keyword ts_rank_cd (GIN)
    AIDB-->>AI: Raw Candidate Chunks
    AI-->>API: Merged RRF Candidate Chunks

    Note over API: Authoritative Document Validation against app.documents
    API->>DB: Verify active status, non-archived, matching generation
    DB-->>API: Active Validated Documents
    Note over API: Assign Stable Source Identifiers (S1, S2, ...)

    API->>AI: POST /internal/v1/llm/generate (Service Token, Sources [S1, S2...])
    Note over AI: Context Builder (Token budget) & Prompt Manager
    AI->>LLM: chat.completions.parse (Structured Output Schema)
    LLM-->>AI: Structured JSON (Answer, Cited IDs, Limitations)
    Note over AI: Citation Validation (Strip Hallucinated IDs)
    AI-->>API: Enriched Response + Usage Telemetry

    Note over API: Hydrate Citations with File/Page Metadata
    API-->>User: Grounded Answer + Validated Citations + Telemetry
```

---

## 2. Architectural Boundaries & Division of Responsibility

| Capability                    | Node.js Express (`@opspilot/api`)                                       | Python Microservice (`ai-service`)                          |
| ----------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Identity & Authentication** | JWT verification, active session checks, platform role checks           | Service-to-service internal bearer token verification       |
| **Multi-Tenancy**             | Route parameter matching, organization membership validation            | Strict query partitioning (`organization_id = :org_id`)     |
| **Authoritative State**       | Verifies `app.documents` status, `archived_at`, `processing_generation` | Read-only access to `ai.document_chunks` and embeddings     |
| **Source Attribution**        | Final authority mapping `S1..Sn` to document metadata and citations     | Passes stable source IDs and extracts cited IDs             |
| **Rate Limiting**             | Redis-backed distributed rate limiter per user/org                      | Bounded worker pools and timeouts                           |
| **LLM Lifecycle**             | Client invoking internal REST API                                       | Singleton `AsyncOpenAI` client connection management        |
| **Prompt Engineering**        | None (zero prompt leakage to Express)                                   | Centralized versioned prompt templates (`rag_assistant_v1`) |
| **Structured Output**         | TypeScript validation via Zod                                           | Pydantic v2 schema constraints with OpenAI parse API        |

---

## 3. Scope Boundaries & Anti-Patterns Avoided

- **No Agentic Tool Calling**: Module 10 does not implement autonomous tool execution, ticket updating, or API mutations. Agentic tools are deferred to Module 11+.
- **No Uncontrolled Hallucination**: An answer is generated only when supporting evidence is retrieved. If evidence is empty, the system terminates early (`insufficient_evidence: true`) without wasting LLM tokens.
- **No Client-Supplied Context**: The public endpoint accepts only queries and filters. Clients cannot inject arbitrary document text for the server to trust as citations.
- **No Secret Leakage**: The OpenAI API key resides solely within the Python AI microservice environment. It is never transmitted across network hops or logged.
