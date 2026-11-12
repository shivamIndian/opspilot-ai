# OpsPilot AI — Enterprise Agentic AI Support Platform

[![Monorepo](https://img.shields.io/badge/Monorepo-npm%20workspaces-blue.svg)](package.json)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%206%20%7C%20Tailwind-61dafb.svg)](apps/web)
[![Express](https://img.shields.io/badge/Backend-Node.js%2022%20%7C%20Express%204%20%7C%20TypeScript-green.svg)](apps/api)
[![FastAPI](https://img.shields.io/badge/AI%20Microservice-Python%203.11%20%7C%20FastAPI%20%7C%20LangGraph-009688.svg)](apps/ai-service)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20pgvector-336791.svg)](infrastructure/postgres)
[![Redis](https://img.shields.io/badge/Cache-Redis%207%20%7C%20BullMQ-dc382d.svg)](infrastructure/redis)
[![Tests](https://img.shields.io/badge/Tests-509%2F509%20Passing%20(100%25)-success.svg)](PROJECT_PROGRESS.md)
[![Terraform](https://img.shields.io/badge/IaC-AWS%20Terraform%20Ready-623ce4.svg)](infrastructure/terraform)

OpsPilot AI is an enterprise-grade Agentic AI platform engineered for mission-critical IT, DevOps, and customer support operations. By integrating hybrid Retrieval-Augmented Generation (RAG) with autonomous multi-step LangGraph workflows, the platform enables organizations to ingest confidential corporate knowledge, diagnose complex operational incidents, and safely execute approved business mutations under strict human-in-the-loop maker-checker controls.

---

## 1. System Architecture

OpsPilot AI is structured as a polyglot monorepo cleanly separating high-throughput business transactions from cognitive AI orchestration:

```
opspilot-ai/
│
├── apps/
│   ├── web/                  # React 18 + Vite 6 + Tailwind CSS SPA (:5173 / :8080)
│   ├── api/                  # Node.js 22 + Express 4 + TypeScript Core REST Gateway (:4000)
│   └── ai-service/           # Python 3.11 + FastAPI + LangGraph AI Microservice (:8000)
│
├── infrastructure/           # Containerization & Cloud Deployment
│   ├── terraform/            # Production AWS IaC (VPC, ALB, ECS Fargate, RDS, ElastiCache, S3)
│   ├── postgres/             # PostgreSQL 16 + pgvector init scripts
│   └── redis/                # Redis 7 Alpine configuration
│
├── docs/                     # Comprehensive Architecture & Operations Documentation
│   ├── architecture/         # System architecture blueprints & ADRs (ADR-001 to ADR-010)
│   ├── database/             # Complete database schema reference ('app' and 'ai' schemas)
│   ├── api/                  # End-to-end REST API reference manual
│   ├── setup/                # Environment configuration and local development guide
│   ├── security/             # Security overview, threat defense, and OWASP safeguards
│   ├── operations/           # Operations runbook, health checks, and backup/restore
│   ├── deployment/           # Deployment guide across Local, CI/CD, and AWS
│   ├── guides/               # Developer guide and business user guide
│   └── modules/              # Dedicated documentation for all 28 project modules
│
├── .github/workflows/        # Automated CI/CD Pipelines (CI, Security, Docker, CD Release)
├── package.json              # Monorepo workspaces definition and root lifecycle scripts
└── docker-compose.yml        # Local infrastructure definition (PostgreSQL 16 + Redis 7)
```

---

## 2. Key Capabilities & Feature Matrix

- **Multi-Tenant Workspaces**: Cryptographically isolated organizations with hierarchical RBAC (`owner`, `admin`, `agent`, `member`, `viewer`).
- **Support Ticket Operations**: Full incident lifecycle with sequential numbering sequences, collaborative comment threads, and event auditing.
- **Document Processing Pipeline**: Multi-format text extraction (PDF, DOCX, TXT) with deterministic paragraph-aware chunking and tokenization (tiktoken).
- **Hybrid RAG Retrieval**: Sub-second search combining `pgvector` HNSW vector similarity with PostgreSQL `tsvector` BM25 keyword matching via Reciprocal Rank Fusion.
- **LLM Grounding & Citation Validation**: Versioned prompts with XML delimiters stripping hallucinated sources and achieving 100% citation accuracy.
- **Tool Registry & Execution Gateway**: Discoverable business tool catalog invoked via cryptographic JWT delegation tokens and internal service headers.
- **Stateful LangGraph Workflows**: Cyclic cognitive execution graphs with durable PostgreSQL checkpoint persistence and real-time streaming.
- **Human-in-the-Loop Maker-Checker Gateway**: Autonomous agents generate formal action proposals; high-risk mutations strictly forbid self-approval and require distinct administrator review.
- **Consent-Scoped Agent Memory**: Personalization system retaining approved facts, preferences, and workflow context with GDPR right-to-erasure controls.
- **Enterprise SaaS UI Shell**: React 18 SPA with route-level code splitting (**50.1% bundle reduction** to 453 kB), dark mode, and accessibility.
- **Operational Observability**: Live Admin Dashboard, Agent Monitoring control plane, and automated RAG Triad evaluation benchmarks.
- **Automated Verification Matrix**: 509 automated tests passing with 100% success rate across all 3 tiers.
- **Cloud-Ready AWS Terraform**: Production-grade modular infrastructure for ECS Fargate, RDS PostgreSQL 16 (pgvector), ElastiCache Redis, S3, CloudFront OAC, and GitHub Actions keyless OIDC.

---

## 3. Quick Start (Local Development)

### Prerequisites
- Node.js `>= 20.0.0`
- Python `>= 3.11.0` and Astral `uv`
- Docker Desktop

### 1. Install Monorepo Dependencies
```bash
npm install
cd apps/ai-service && uv sync --dev && cd ../..
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Spin Up Local Infrastructure
```bash
# Starts PostgreSQL 16 (pgvector) and Redis 7 in background
npm run infra:up
```

### 4. Execute Dual Database Migrations
```bash
# Applies node-pg-migrate (schema 'app') and Alembic (schema 'ai')
npm run db:migrate
```

### 5. Launch All Services Concurrently
```bash
npm run dev
```
- **Web Application**: `http://localhost:5173`
- **Core Node.js API**: `http://localhost:4000/api/v1`
- **Python AI Microservice**: `http://localhost:8000`

---

## 4. Automated Testing Suite

OpsPilot AI enforces continuous quality gates across the entire monorepo:

```bash
# Run all 509 tests across all workspaces
npm test

# Run individual tier test suites
npm run test:web         # 72 tests (React Web)
npm run test:api         # 259 tests (Node.js API)
npm run test:ai          # 178 tests (Python AI Service)

# Run targeted contract & lifecycle suites
npm run test:contracts   # Inter-service schema contracts
npm run test:e2e         # End-to-end support lifecycle simulation
```

### Test Coverage Summary:
- **Node.js API (`@opspilot/api`)**: 23 test files, 259 tests &mdash; **100% Pass**
- **React Web (`@opspilot/web`)**: 12 test files, 72 tests &mdash; **100% Pass**
- **Python AI Service (`apps/ai-service`)**: 16 test files, 178 tests &mdash; **100% Pass**
- **Total Monorepo Suite**: **51 test files, 509 tests &mdash; 100% Passing**

---

## 5. Master Roadmap & Project Status (Modules 01–28)

| Module | Title | Status | Evidence / Reference |
| :---: | :--- | :---: | :--- |
| **01** | Architecture & Monorepo Setup | ✅ Complete | Polyglot npm workspaces, TypeScript 5, Vite 6, uv |
| **02** | Database & Cache Infrastructure | ✅ Complete | PostgreSQL 16 `pgvector`, Redis 7, dual migrations |
| **03** | Authentication & Authorization | ✅ Complete | Argon2id, JWT, atomic session rotation, CSRF (25 tests) |
| **04** | Organization & Multi-Tenancy | ✅ Complete | Row-level tenant isolation, invitations, RBAC (31 tests) |
| **05** | Support Ticket Management | ✅ Complete | Atomic ticket sequences, comments, event audit (32 tests) |
| **06** | Document Storage Abstraction | ✅ Complete | `IStorageProvider`, S3/local adapter, MIME guards (18 tests) |
| **07** | Document Processing & Chunking | ✅ Complete | PyMuPDF, python-docx, deterministic chunking (15 tests) |
| **08** | Embeddings & Vector Database | ✅ Complete | OpenAI text-embedding-3-small, pgvector HNSW (31 tests) |
| **09** | RAG Hybrid Retrieval Engine | ✅ Complete | Cosine vector + BM25 tsvector Reciprocal Rank Fusion (13 tests) |
| **10** | LLM Grounding & Citations | ✅ Complete | XML prompt shields, authoritative citation checks (17 tests) |
| **11** | Agent Tool Registry | ✅ Complete | Tool gateway, JWT delegation tokens, audit logs (36 tests) |
| **12** | LangGraph Workflow Engine | ✅ Complete | Cyclic state graphs, PostgreSQL checkpointer (26 tests) |
| **13** | Multi-Step Agent Execution | ✅ Complete | ReAct loop, plan limits, cycle prevention (16 tests) |
| **14** | Human-in-the-Loop Approvals | ✅ Complete | Maker-checker policy, interrupt checkpoints (24 tests) |
| **15** | Persistent Agent Memory | ✅ Complete | Consent scoping, user privacy controls, forget-all (20 tests) |
| **16** | Frontend Foundation & Shell | ✅ Complete | React 18, Tailwind UI primitives, Zustand store (17 tests) |
| **17** | Authentication UI | ✅ Complete | Login, Register, Password Reset, Route Guards (22 tests) |
| **18** | Admin Operations Dashboard | ✅ Complete | Operations KPIs, ticket charts, recent activity (4 tests) |
| **19** | AI Chat Interface | ✅ Complete | Interactive citations, streaming, context drawer (4 tests) |
| **20** | Knowledge Base UI | ✅ Complete | Document upload dialog, status polling, catalog (5 tests) |
| **21** | Ticket & Approval UI | ✅ Complete | Proposal diff cards, maker-checker warnings (4 tests) |
| **22** | Agent Monitoring Control Plane | ✅ Complete | Latency percentiles, tool failure breakdown (4 tests) |
| **23** | AI Quality Evaluation UI | ✅ Complete | RAG Triad radar benchmarks, dataset manager (4 tests) |
| **24** | Security & Performance Hardening| ✅ Complete | 50.1% bundle drop, SSRF guard, logger redaction (16 tests) |
| **25** | Automated Testing & Contracts | ✅ Complete | Inter-service contracts, queue resilience, E2E (509 tests) |
| **26** | DevSecOps & CI/CD Pipelines | ✅ Complete | GitHub Actions CI, security audits, non-root Dockerfiles |
| **27** | AWS Cloud Deployment (IaC) | ✅ Complete | Production Terraform (VPC, ALB, ECS, RDS, Redis, S3, OIDC) |
| **28** | Final Documentation & Handover | ✅ Complete | Exhaustive docs, ADRs, schema specs, runbooks, guides |

---

## 6. Documentation Index

- **System Architecture**: [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)
- **Database Schema**: [docs/database/database-schema.md](docs/database/database-schema.md)
- **API Reference**: [docs/api/api-reference.md](docs/api/api-reference.md)
- **Environment Configuration**: [docs/setup/environment-configuration.md](docs/setup/environment-configuration.md)
- **Local Development Guide**: [docs/setup/local-development.md](docs/setup/local-development.md)
- **Security Overview**: [docs/security/security-overview.md](docs/security/security-overview.md)
- **Operations Runbook**: [docs/operations/operations-runbook.md](docs/operations/operations-runbook.md)
- **Backup & Disaster Recovery**: [docs/operations/backup-restore.md](docs/operations/backup-restore.md)
- **Deployment Guide**: [docs/deployment/deployment-guide.md](docs/deployment/deployment-guide.md)
- **AWS Terraform Blueprint**: [infrastructure/terraform/README.md](infrastructure/terraform/README.md)
- **Architecture Decision Records (ADRs)**: [docs/architecture/decisions/](docs/architecture/decisions/)
- **Developer Guide**: [docs/guides/developer-guide.md](docs/guides/developer-guide.md)
- **User Guide**: [docs/guides/user-guide.md](docs/guides/user-guide.md)

---

## 7. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
