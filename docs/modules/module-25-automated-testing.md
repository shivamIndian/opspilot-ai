# Module 25: Automated Testing & Verification Suite

## 1. Overview & Objectives

Module 25 establishes a unified, multi-tiered automated testing architecture across the entire OpsPilot AI platform. As an enterprise Agentic AI support platform handling confidential operational data, multi-tenant knowledge bases, and autonomous LangGraph agents capable of performing high-impact mutations, deterministic quality gates are critical.

The testing architecture spans three primary software tiers:
1. **Frontend (`@opspilot/web`)**: React 18 component rendering, navigation, mock data hooks, RBAC view gating, and UI boundary error handling.
2. **Backend API (`@opspilot/api`)**: Express 4 REST endpoints, authentication & authorization middleware, multi-tenancy isolation, queue resilience, inter-service schema contracts, and end-to-end operational lifecycle simulations.
3. **AI Service (`apps/ai-service`)**: FastAPI endpoints, RAG embeddings & retrieval, hybrid search pipelines, LangGraph stateful workflow execution, human-in-the-loop resumption, SSRF guards, and AI evaluation metrics.

---

## 2. Test Architecture & Coverage Matrix

| Test Category | Target Package / Directory | Test Runner | Files | Test Count | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **API Integration & Contracts** | `apps/api/tests/` | Vitest 2.1 | 23 | 259 | ✅ 100% Passing |
| **Frontend UI & Boundaries** | `apps/web/tests/` | Vitest 4.1 / JSDOM | 12 | 72 | ✅ 100% Passing |
| **AI Workflows & RAG** | `apps/ai-service/tests/` | Pytest 9.2 / AnyIO | 16 | 178 | ✅ 100% Passing |
| **Total Test Suite** | Full Monorepo | Vitest + Pytest | **51** | **509** | ✅ **509/509 Passing** |

---

## 3. Key Test Suites Implemented in Module 25

### 3.1 Inter-Service Schema Contracts (`apps/api/tests/api-contracts.test.ts`)
Validates rigorous data contract alignment between Node.js API and Python AI Service:
- **Workflow Run Payloads**: Validates input schema (`threadId`, `userMessage`, `ticketContext`, `metadata`) and response structure (`runId`, `threadId`, `status`, `answer`, `citations`).
- **Tool Discovery & Invocations**: Validates tool registry schema definitions (names, input schemas, required parameters) and structured execution results.
- **Evaluation Payload Contracts**: Asserts RAG Triad benchmark schemas (ground truth, context, question, expected citation tags).
- **Error Envelopes**: Enforces standardized RFC 7807-compliant error structures across services (`code`, `message`, `requestId`, `timestamp`, `details`).

### 3.2 Background Queue Lifecycle & Resilience (`apps/api/tests/queue-lifecycle.test.ts`)
Validates BullMQ worker behavior under failure modes:
- **Exponential Backoff Configuration**: Confirms retry policies (3 attempts, exponential backoff starting at 2000ms).
- **Deterministic Deduplication**: Confirms that job IDs are derived deterministically (`${documentId}:${generation}`) preventing duplicate concurrent processing.
- **Error Discrimination**: Tests distinction between retryable transient errors (HTTP 429, 500) and unrecoverable terminal errors (422 schema validation, file corruption) to prevent infinite poison pill loops.

### 3.3 End-to-End Operational Lifecycle Simulation (`apps/api/tests/e2e-workflow.test.ts`)
Simulates the complete enterprise support operational lifecycle:
1. **Ticket Creation**: Authenticated user submits an incident ticket (`POST /tickets`) generating a sequential ticket number.
2. **Autonomous Agent Analysis**: AI agent detects critical SLA risks and proposes a priority escalation tool call (`tickets_update_priority`).
3. **Maker-Checker Policy Enforcement**: Verifies that high-risk proposals cannot be self-approved and require distinct administrator review.
4. **Human Reviewer Decision**: Admin inspects proposal details and submits an authorized approval (`POST /agent/approvals/:id/approve`).
5. **Durable Outbox Mutation**: Verifies that approval records are updated and outbox dispatch is prepared.

### 3.4 UI Boundaries & Error Pages (`apps/web/tests/error-boundaries.test.tsx`)
Validates graceful fallback rendering for abnormal client conditions:
- **404 Not Found Page**: Tests route catch-alls, friendly explanation messaging, and return navigation links.
- **403 Forbidden Page**: Tests RBAC denial views, contact admin callouts, and clean dashboard redirects.

---

## 4. Execution Commands

Developers and CI systems can invoke tests via dedicated workspace scripts:

```bash
# Run all tests monorepo-wide
npm test

# Run individual tier test suites
npm run test:web         # 72 tests (apps/web)
npm run test:api         # 259 tests (apps/api)
npm run test:ai          # 178 tests (apps/ai-service)

# Run targeted contract & E2E suites
npm run test:contracts   # Inter-service schema contract tests
npm run test:e2e         # End-to-end operational lifecycle simulation
```

---

## 5. Security & Isolation Invariants

1. **No Production Database Pollution**: All tests utilize mocked connection pools, transactional rollbacks, or isolated in-memory test databases.
2. **Zero Leaked Secrets**: Automated tests verify that test tokens, mock credentials, and dummy API keys are masked or redacted in all output streams.
3. **Multi-Tenant Boundary Testing**: Dedicated test cases assert that cross-organization query parameters or invalid tenant IDs return 403 or 404 without leaking resource existence.
