# OpsPilot AI — Local Development Setup Guide

Follow this guide to spin up a fully functional, containerized local development environment for OpsPilot AI.

---

## 1. Prerequisites

Before starting, ensure the following software is installed on your workstation:

- **Node.js**: `>= 20.0.0` (Node 22 recommended)
- **NPM**: `>= 10.0.0`
- **Python**: `>= 3.11.0` (Python 3.11.9 recommended)
- **Astral uv**: Fast Python package installer (`curl -LsSf https://astral.sh/uv/install.sh | sh` or `pip install uv`)
- **Docker Desktop**: With Docker Compose v2 enabled

---

## 2. Initial Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/organization/opspilot-ai.git
cd opspilot-ai
```

### Step 2: Install Node.js Monorepo Dependencies
```bash
npm install
```

### Step 3: Install Python AI Microservice Dependencies
```bash
cd apps/ai-service
uv sync --dev
cd ../..
```

### Step 4: Configure Environment Files
Copy the template configuration into `.env`:
```bash
cp .env.example .env
```

---

## 3. Starting Local Infrastructure

You can run PostgreSQL and Redis either via Docker Compose or via a local native installation:

### Option A: Docker Compose (Recommended if Docker Desktop is installed)

Spin up PostgreSQL 16 (with `pgvector`) and Redis 7 using Docker Compose:

```bash
# Start PostgreSQL and Redis containers in background
npm run infra:up

# Check container health status
npm run infra:status
```

*Expected Output*:
- `opspilot-postgres`: Healthy on port 5432
- `opspilot-redis`: Healthy on port 6379

### Option B: Local Native PostgreSQL & Redis

If you run PostgreSQL directly on your host machine (e.g., Windows native PostgreSQL on port 5432):

```bash
# Provision database 'opspilot_db', roles 'opspilot_api' & 'opspilot_ai', and schemas 'app' & 'ai'
npm run db:init:local
```

This automated script reads your `.env` configuration, connects to PostgreSQL using the administrator role (`postgres`), and safely provisions the necessary roles and permissions with least privilege.

---

## 4. Running Database Migrations

Apply the dual database migrations across both schemas:

```bash
# Runs node-pg-migrate for schema 'app' and Alembic for schema 'ai'
npm run db:migrate
```

To verify status:
```bash
npm run db:status
```

---

## 5. Starting the Applications

### Option A: Start All Services Concurrently
```bash
# Launches Frontend (:5173), API (:4000), AI Service (:8000), and Worker
npm run dev
```

### Option B: Start Services Individually
```bash
# Terminal 1: React Web Application
npm run dev:web

# Terminal 2: Node.js API Gateway
npm run dev:api

# Terminal 3: BullMQ Document & Approval Worker
npm run dev:worker

# Terminal 4: Python FastAPI AI Service
npm run dev:ai
```

---

## 6. Running Automated Tests

All test suites can be executed independently or across the entire monorepo:

```bash
# Execute entire monorepo suite (509 tests)
npm test

# Target individual application suites
npm run test:web         # 72 tests (React Web)
npm run test:api         # 259 tests (Node.js API)
npm run test:ai          # 178 tests (Python AI Service)

# Run targeted contract and E2E simulation suites
npm run test:contracts   # Inter-service schema contract tests
npm run test:e2e         # End-to-end support lifecycle simulation
```

---

## 7. Troubleshooting Common Issues

### Issue 1: Database role `opspilot_api` or `opspilot_ai` does not exist
- **Cause**: Local PostgreSQL instance or Docker container was started without running the role initialization routine.
- **Fix for Local PostgreSQL**: Run `npm run db:init:local` to provision `opspilot_db` and all application roles and schemas.
- **Fix for Docker**: Run `npm run infra:down -v` (removes old uninitialized volume) and restart with `npm run infra:up`.

### Issue 2: `uv: command not found`
- **Fix**: Install Astral `uv` via `pip install uv` or ensure `~/.cargo/bin` is added to your shell `$PATH`.

### Issue 3: Port 4000 or 5173 already in use
- **Fix**: Stop the competing process or specify an alternative port in your `.env` file (`PORT=4001`).
