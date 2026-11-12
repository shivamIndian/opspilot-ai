# OpsPilot AI — Technology Stack Selection & Rationale

This document details the approved technology stack for OpsPilot AI, outlining the architectural justification, performance characteristics, and trade-offs considered for each component.

---

## 1. Frontend Technologies

### 1.1 React 18 & TypeScript

- **Rationale**: React remains the global standard for building complex enterprise single-page web applications with rich ecosystem support, high talent availability, and unmatched UI component libraries. TypeScript provides compile-time type verification, robust refactoring capabilities, and self-documenting code across large engineering teams.
- **Trade-off Consideration**: Compared to meta-frameworks like Next.js, a Vite SPA removes unnecessary SSR server complexity for an authenticated internal enterprise control plane where SEO is irrelevant.

### 1.2 Vite 6

- **Rationale**: Powered by esbuild and Rollup, Vite provides near-instantaneous Hot Module Replacement (HMR) during development and lean, optimized ES module production builds. It drastically reduces developer feedback loops compared to legacy Webpack setups.

### 1.3 Tailwind CSS

- **Rationale**: Utility-first CSS eliminates bloated separate stylesheet files, enforces design token consistency (spacing, typography, color palettes), and purges unused styles during build time to produce micro-sized CSS footprints.

### 1.4 React Router v6

- **Rationale**: Provides client-side routing with declarative route definitions, nested layouts, and future data-loader integration patterns without reloading the browser window.

### 1.5 TanStack Query (React Query v5)

- **Rationale**: Solves the server-state synchronization problem. Eliminates manual `useEffect` fetching bugs by providing automatic background caching, revalidation on window focus, garbage collection, and mutation rollback capabilities.

### 1.6 Zustand

- **Rationale**: High-performance, un-opinionated state management with a tiny bundle footprint (<1KB). Unlike Redux, it requires zero boilerplate, avoids context-re-render cascades, and separates client UI state cleanly from server data.

### 1.7 Axios

- **Rationale**: Predictable promise-based HTTP client providing unified interceptors for JWT token injection, automated refresh cycles, standardized response transformations, and request timeouts.

---

## 2. Main Backend Technologies (`@opspilot/api`)

### 2.1 Node.js 22 LTS

- **Rationale**: Node.js's event-driven, non-blocking I/O model makes it ideal for handling high-volume concurrent network requests, real-time WebSockets, and orchestration between client frontends and downstream services.

### 2.2 Express.js

- **Rationale**: Minimalist, battle-tested HTTP framework offering absolute transparency and zero hidden magic. While opinionated frameworks like NestJS impose heavy decorator overhead and abstraction layers, Express provides razor-sharp control over middleware execution, performance profiling, and routing mechanics.

### 2.3 Zod

- **Rationale**: TypeScript-first runtime schema declaration and validation. Ensures that runtime inputs (environment variables, request headers, query parameters, and JSON payloads) strictly match compile-time TypeScript types, preventing invalid configurations from launching.

### 2.4 Helmet & CORS

- **Rationale**: Industry-standard defense-in-depth security middleware. Helmet sets secure HTTP response headers (Content-Security-Policy, Strict-Transport-Security, X-Frame-Options) preventing clickjacking and MIME-sniffing, while CORS strictly governs cross-origin browser interactions.

---

## 3. AI Microservice Technologies (`opspilot-ai-service`)

### 3.1 Python 3.11+

- **Rationale**: Python is the lingua franca of machine learning, modern AI engineering, and agent orchestration. Its rich ecosystem (LangChain, LangGraph, PyTorch, Hugging Face) makes it the only realistic choice for cognitive workloads.

### 3.2 FastAPI & Uvicorn

- **Rationale**: FastAPI combines high performance (on par with NodeJS and Go via Starlette and Uvicorn) with automatic OpenAPI / Swagger documentation generation and native asynchronous event loop primitives (`async`/`await`).

### 3.3 Pydantic v2

- **Rationale**: Core validation library rewritten in Rust, providing up to 20x faster data parsing and strict schema enforcement for LLM JSON outputs, tool call arguments, and service settings.

### 3.4 Astral `uv`

- **Rationale**: Next-generation Python package and environment manager built in Rust. It replaces legacy `pip`, `pip-tools`, and `virtualenv`, resolving and installing packages up to 10-100x faster while ensuring deterministic cross-platform lockfiles.

---

## 4. Future Infrastructure & Architectural Roadmap

The following technologies are architecturally approved for future modules:

| Component                 | Technology       | Target Module  | Architectural Value                                                        |
| :------------------------ | :--------------- | :------------- | :------------------------------------------------------------------------- |
| **Primary Relational DB** | PostgreSQL 16    | Module 02      | ACID compliance, robust indexing, enterprise row-level security.           |
| **Vector Storage**        | `pgvector`       | Module 02 & 06 | Unifies document metadata and high-dimensional embeddings in one database. |
| **Distributed Cache**     | Redis 7          | Module 04      | In-memory token blacklists, session storage, and rate-limiting counters.   |
| **Asynchronous Queuing**  | BullMQ           | Module 05      | Robust task scheduling, job retries, and backoff management in Node.js.    |
| **Event Streaming**       | Apache Kafka     | Module 18      | High-throughput, distributed event logging for enterprise audit pipelines. |
| **Containerization**      | Docker & Compose | Module 20      | Reproducible multi-service deployment topologies.                          |
| **Cloud Hosting**         | AWS (EKS / RDS)  | Module 25+     | Enterprise compliance, high availability, multi-region failover.           |
