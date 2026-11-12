# Module 24: Security & Performance Hardening Documentation

## 1. Executive Summary & Audit Scope

Module 24 establishes a comprehensive security hardening and performance optimization framework for OpsPilot AI across all tiers (React Web, Node.js API Gateway, Python FastAPI AI Microservice, PostgreSQL, and Redis).

### Review Scope
- **Review Date**: November 2026
- **Standards & Guidance**: OWASP Top 10 for Web Applications, OWASP API Security Top 10, OWASP Top 10 for LLM Applications (v1.1), Least-Privilege Access Controls, and High-Performance Async Patterns.
- **Scope**: Multi-tenancy boundaries, Insecure Direct Object Reference (IDOR), prompt injection defense, server-side request forgery (SSRF), secrets logging redaction, rate limiting, and route code-splitting.

---

## 2. Threat Model & Security Controls

```
                        ATTACK VECTOR                       DEFENSE MECHANISM
               ┌───────────────────────────────┐     ┌───────────────────────────────┐
               │ Cross-Tenant Data Access      │ ──> │ DB-Level Tenant Membership &  │
               │ (IDOR / BOLA)                 │     │ Organization Context Guard    │
               └───────────────────────────────┘     └───────────────────────────────┘
               ┌───────────────────────────────┐     ┌───────────────────────────────┐
               │ Indirect Prompt Injection     │ ──> │ Strict XML <retrieved_context>│
               │ via Malicious Document Chunks │     │ Isolation & Inert Instruction │
               └───────────────────────────────┘     └───────────────────────────────┘
               ┌───────────────────────────────┐     ┌───────────────────────────────┐
               │ Tool SSRF to Cloud Metadata   │ ──> │ Hostname & IP Filtering       │
               │ (169.254.169.254 / Loopback)  │     │ in ssrf_guard.py              │
               └───────────────────────────────┘     └───────────────────────────────┘
               ┌───────────────────────────────┐     ┌───────────────────────────────┐
               │ Memory Exhaustion / Payload   │ ──> │ express.json({ limit: '2mb' })│
               │ Denial-of-Service             │     │ & Multi-Tiered Rate Limiters  │
               └───────────────────────────────┘     └───────────────────────────────┘
               ┌───────────────────────────────┐     ┌───────────────────────────────┐
               │ Sensitive Credential Exposure │ ──> │ SecretMaskingFilter (Python)  │
               │ in Server Logs                │     │ & redactSensitiveData (Node)  │
               └───────────────────────────────┘     └───────────────────────────────┘
```

---

## 3. Security Hardening Measures Implemented

### 3.1 Authentication & Multi-Tenancy Protection
- **Cross-Tenant IDOR Guard**: All organization-scoped endpoints strictly validate that the authenticated user possesses an active membership in the requested organization. Querying or mutating tickets, documents, memories, workflows, or approvals across organizations is blocked at the gateway with `403 Forbidden` (`FORBIDDEN_NOT_ORGANIZATION_MEMBER`).
- **Argon2id Hashing**: High-entropy password hashing with memory and parallelism parameters.
- **Double-Submit CSRF Verification**: State-changing requests enforce cookie-to-header token matching.
- **HttpOnly Cookies**: Session refresh tokens are stored in `HttpOnly`, `SameSite=Lax` cookies (with `Secure` in production) to prevent JavaScript token theft.

### 3.2 HTTP Security Headers & Payload Boundaries
- **Helmet CSP Directives**: Configured `Content-Security-Policy` with `'self'` default source, disabled object and frame embedding, and restricted external connections.
- **Sniff & Frame Protection**: Enforces `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- **Payload Limits**: Strict 2MB request body cap on JSON and URL-encoded bodies, mitigating memory-exhaustion denial of service.

### 3.3 Tiered Rate Limiting & Abuse Prevention
- **`globalApiLimiter`**: 300 requests per 15 minutes across public and organization routes.
- **`aiOperationsLimiter`**: 60 requests per 15 minutes dedicated to expensive LLM, RAG question-answering, LangGraph workflow execution, and evaluation runs.
- **`fileUploadLimiter`**: 30 uploads per 15 minutes to safeguard disk storage and extraction worker queues.
- Redis-backed distributed store with automatic graceful in-memory fallback.

### 3.4 Agentic AI Security Controls
- **Prompt Injection Defense**: Explicit XML encapsulation separating system policies from untrusted reference documents (`<retrieved_context>`) and user queries. System instructions explicitly reject instructions embedded in document text.
- **SSRF Protection (`app/tools/ssrf_guard.py`)**: Outbound URLs requested by tools are validated. Rejects non-HTTP(S) protocols, loopback addresses (`127.0.0.1`, `localhost`), link-local IPs, private RFC1918 subnets, and cloud metadata IPs (`169.254.169.254`, `metadata.google.internal`).
- **Human-in-the-Loop Resumption**: Write actions produce immutable proposals (`app.agent_action_proposals`) that require explicit human approval; prompts cannot override approval policies.

### 3.5 Automated Credential Redaction in Logging
- **Node.js Gateway (`src/utils/logger.ts`)**: Recursive redaction replaces `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, and inline `Bearer` tokens with `[REDACTED]`.
- **Python AI Microservice (`app/core/logging.py`)**: `SecretMaskingFilter` intercepts all log records before output and regex-masks OpenAI API keys, tokens, and passwords.

---

## 4. Performance Optimizations & Measurements

### 4.1 Frontend Route-Level Code Splitting (Vite)
- **Problem**: Monolithic bundle loading all 20+ feature pages eagerly during initial page load, leading to high initial JS transfer.
- **Solution**: Implemented `React.lazy()` with `Suspense` and fallback spinner in `apps/web/src/routes/index.tsx`.
- **Measurement Results**:
  - **Before (Baseline Monolithic Bundle)**:
    - `dist/assets/index-VCxsmHzh.js`: **907.54 kB** (gzip: 218.20 kB).
    - Single large chunk warning triggered.
  - **After (Optimized Dynamic Chunks)**:
    - Main entry chunk: **453.04 kB** (gzip: 137.85 kB).
    - **Initial JS Bundle Size Reduced by 50.1%** (-454.5 kB).
    - Feature chunks (KnowledgeBasePage: 80 kB, AdminDashboardPage: 35 kB, ChatPage: 24 kB, TicketsPage: 13 kB, etc.) loaded on demand.
    - Production build time: 7.52s.

### 4.2 Database Index Optimizations
Created migration `1700000000009_add-performance-indices.cjs`:
- `idx_documents_org_created_at` on `app.documents (organization_id, created_at DESC)`: Eliminates in-memory sorting on organization document catalogs.
- `idx_agent_proposals_org_created` on `app.agent_action_proposals (organization_id, created_at DESC)`: Optimizes human approval inbox queries.
- `idx_ticket_comments_ticket_created` on `app.ticket_comments (ticket_id, created_at ASC)`: Accelerates ticket timeline retrieval.
- `idx_tickets_org_status_created` on `app.tickets (organization_id, status, created_at DESC)`: Speeds up filtered ticket lists.

---

## 5. Verification & Testing

- **Node.js Security Test Suite (`apps/api/tests/security-performance.test.ts`)**:
  - Cross-tenant IDOR access rejection (403).
  - Malformed non-UUID boundary validation (400).
  - Strict security headers (`CSP`, `nosniff`, `DENY`).
  - Request body limit rejection (413).
  - Nested and inline credential redaction in logger.
  - Double-submit CSRF token mismatch rejection (403).
  - **7 / 7 tests passed**; **246 / 246** total in `@opspilot/api`.
- **Python AI Security Test Suite (`apps/ai-service/tests/test_security_performance.py`)**:
  - SSRF guard blocks cloud metadata (`169.254.169.254`).
  - SSRF guard blocks loopback (`127.0.0.1`) and private IPs (`10.0.0.5`).
  - SSRF guard blocks forbidden schemes (`file://`, `ftp://`).
  - `SecretMaskingFilter` redacts passwords, API keys (`sk-proj-...`), and Bearer tokens.
  - Data sanitization strips control characters and masks nested dict secrets.
  - **9 / 9 tests passed**; **178 / 178** total in `ai-service`.
- **React Web Tests (`apps/web/tests/`)**:
  - **70 / 70 tests passed** across all 11 test files.
- **Monorepo Total**:
  - **494 / 494 passing tests** across the repository with 0 failures.

---

## 6. Remaining Risks & Ongoing Monitoring

1. **Prompt Injection Inherent Non-Determinism**: While XML delimiters, strict system instructions, and citation validation mitigate injection, LLM prompt injection can never be 100% mathematically prevented; defense-in-depth and read-only default permissions remain necessary.
2. **External Antivirus Scanning**: File uploads are verified by magic bytes, size limits, and extension normalization. An asynchronous antivirus integration (e.g. ClamAV) should be integrated in cloud deployment (Module 27).
