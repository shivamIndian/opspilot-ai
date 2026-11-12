# PostgreSQL Infrastructure & pgvector Configuration

This directory contains the database initialization routines, configuration blueprints, and schema management documentation for the OpsPilot AI platform.

## Architecture

- **Engine**: PostgreSQL 16
- **Image**: `pgvector/pgvector:pg16`
- **Database**: `opspilot_db`
- **Default Port**: `127.0.0.1:5432` (strictly bound to localhost)

## Schemas & Ownership Model

OpsPilot AI enforces strict schema separation:

1. **`app` Schema**:
   - **Owner**: `opspilot_api`
   - **Used By**: Node.js Express backend (`@opspilot/api`)
   - **Scope**: Core business models (users, organizations, tickets, approvals, audit logs).

2. **`ai` Schema**:
   - **Owner**: `opspilot_ai`
   - **Used By**: Python FastAPI AI microservice (`opspilot-ai-service`)
   - **Scope**: Document chunks, high-dimensional vector embeddings, LangGraph checkpoints, and agent episodic memory.

## Security & Access Control

- **Principle of Least Privilege**: Application roles do not have superuser privileges (`NOSUPERUSER`).
- **Isolation**: `opspilot_api` cannot access `ai` schema; `opspilot_ai` cannot access `app` schema.
- **Administrator Role**: `opspilot_admin` is used solely by Docker Compose for container initialization and extension provisioning.

## Initialization Options

### Option A: Local Native PostgreSQL Instance (Windows / Linux / macOS)

If you have a native PostgreSQL service installed locally (such as PostgreSQL 16, 17, or 18 running on port 5432):

```powershell
# Reads database credentials from .env and provisions database, roles, schemas, and grants
npm run db:init:local
```

This runs `scripts/init-local-db.ts`, which connects to `localhost:5432` using your administrator account (default: `postgres`) and:
1. Creates the target database `opspilot_db` if not already present.
2. Idempotently provisions login roles `opspilot_api` and `opspilot_ai` with least-privilege attributes (`NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`).
3. Grants `CONNECT, CREATE ON DATABASE opspilot_db` to both roles (required for schema migrations in PostgreSQL 15+).
4. Configures `app` schema owned by `opspilot_api` and `ai` schema owned by `opspilot_ai`.
5. Establishes default table/sequence/routine privileges for future objects.
6. Enforces cross-schema isolation (`REVOKE ALL ON SCHEMA ai FROM opspilot_api` and `REVOKE ALL ON SCHEMA app FROM opspilot_ai`).

Alternatively, execute the idempotent SQL script directly via `psql`:
```bash
psql -U postgres -h localhost -p 5432 \
  -v ON_ERROR_STOP=1 \
  -v api_db_password='your_api_password' \
  -v ai_db_password='your_ai_password' \
  -f infrastructure/postgres/init/01-create-application-roles.sql
```

### Option B: Docker Compose Container Initialization

The initialization script (`init/01-init.sh`) runs automatically on container creation **only when the data directory (`/var/lib/postgresql/data`) is uninitialized**. If a persistent volume (`postgres_data`) already exists, PostgreSQL skips `/docker-entrypoint-initdb.d/`.

To re-run initialization from scratch:

```powershell
docker compose down -v
docker compose up -d
```

> **Warning**: `docker compose down -v` permanently removes existing container database data.

## Running Database Migrations

After the database and roles are provisioned:
```powershell
# Runs Node.js node-pg-migrate (schema 'app') and Python Alembic (schema 'ai')
npm run db:migrate
```
