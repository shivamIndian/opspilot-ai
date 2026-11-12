# OpsPilot AI — Architecture Decision Records (ADRs)

This document records the foundational architectural decisions, context, evaluated alternatives, and consequences for OpsPilot AI.

---

## ADR 001: Vite + React SPA instead of Next.js

### Status

Accepted

### Context

We evaluated building the OpsPilot AI frontend using Next.js (App Router with SSR/RSC) versus a React Single Page Application (SPA) bundled via Vite.

### Decision

Adopt React 18 + Vite as a pure client-side SPA.

### Rationale

1. **Target Persona & Security**: OpsPilot AI is an authenticated enterprise internal operations platform. It does not require public Search Engine Optimization (SEO) or social open-graph crawling.
2. **Operational Simplicity**: A Vite build generates static HTML, CSS, and JS assets that can be distributed via edge CDNs (Cloudflare, AWS CloudFront + S3) with zero Node.js server maintenance overhead for the frontend.
3. **Decoupled Architecture**: Next.js tends to couple frontend presentation tightly with backend server action logic. Retaining a clean SPA forces strict API boundary contracts between the frontend and the backend.

---

## ADR 002: Express.js instead of NestJS for Core API

### Status

Accepted

### Context

We evaluated whether to use an opinionated enterprise framework like NestJS (Angular-style dependency injection and decorators) versus a lightweight, explicit Express.js architecture with TypeScript.

### Decision

Adopt Express.js with TypeScript and Zod validation.

### Rationale

1. **Zero Hidden Magic**: Express.js is battle-tested, transparent, and avoids heavy TypeScript reflection metadata (`reflect-metadata`) and decorator compilation overhead.
2. **Fine-Grained Performance**: Express enables exact control over middleware execution ordering, stream handling, and socket connections without framework abstraction layers.
3. **Interview & Engineering Transparency**: Explicit architecture using layered patterns (Controllers -> Services -> Repositories) clearly demonstrates foundational software engineering principles without relying on framework-specific scaffolding.

---

## ADR 003: Monorepo Architecture for Multi-Service Ecosystem

### Status

Accepted

### Context

We evaluated whether to maintain separate Git repositories for the Web UI, API, and AI service (polyrepo) versus unified management within an npm workspaces monorepo.

### Decision

Adopt a single monorepo (`opspilot-ai/`) utilizing npm workspaces for JavaScript/TypeScript packages alongside a standalone Python workspace managed via `uv`.

### Rationale

1. **Atomic Versioning & Commits**: Changes spanning contracts (e.g. adding a new health metric or API endpoint) can be committed and reviewed in a single atomic pull request.
2. **Simplified Developer Onboarding**: A single `git clone` followed by `npm install` and `npm run dev` bootstraps the entire multi-tier stack locally without requiring complex local networking or git submodules.
3. **Shared Tooling**: Shared ESLint, Prettier, and CI workflow configurations eliminate configuration drift.

---

## ADR 004: Polyglot Division — Node.js for Business Core vs. Python for AI Orchestration

### Status

Accepted

### Context

We evaluated whether to build the entire system purely in Node.js (using LangChain.js) or purely in Python (using Django/FastAPI for both API and AI), versus a polyglot separation of responsibilities.

### Decision

Isolate general business logic, multi-tenancy, authentication, and CRUD inside the **Node.js Express API**, while dedicating the **Python FastAPI microservice** exclusively to AI orchestration, RAG, and LangGraph workflows.

### Rationale

1. **AI Ecosystem Maturity**: Python is the unrivaled leader in machine learning, model fine-tuning, embeddings generation, and agent framework development (LangGraph, PyTorch, Hugging Face). LangChain.js often lags behind Python in feature parity, community patterns, and library support.
2. **High-Throughput I/O for Business APIs**: Node.js excels at non-blocking I/O, relational database transactions, real-time WebSockets, and rapid JSON serialization, making it ideal for the customer-facing API gateway.
3. **Fault & Resource Isolation**: Heavy LLM generation and vector embedding computations in Python will not starve or block the Node.js event loop that handles user authentication and interactive UI traffic.
4. **Independent Scaling**: The AI service can be scaled horizontally on GPU/high-memory compute instances (e.g., AWS EKS with GPU node groups) while the Node.js API runs on lightweight, cost-effective serverless or container tiers.
