# OpsPilot AI — Database Migration Architecture & Workflows

OpsPilot AI establishes strict schema and migration ownership across its polyglot microservice stack.

---

## 1. Schema & Migration Separation Policy

| Domain             | Owner Service                      | Migration Engine  | Target Schema | Version Tracking Table |
| :----------------- | :--------------------------------- | :---------------- | :------------ | :--------------------- |
| **Business Data**  | Node.js Express (`apps/api`)       | `node-pg-migrate` | `app`         | `app.pgmigrations`     |
| **Cognitive Data** | Python FastAPI (`apps/ai-service`) | `alembic`         | `ai`          | `ai.alembic_version`   |

### Architectural Invariants

1. **Never Share Migration Tables**: Node.js migrations write exclusively to `app.pgmigrations`; Python migrations write exclusively to `ai.alembic_version`.
2. **Never Cross Schema Boundaries**: Node.js migrations must never create or alter tables in the `ai` schema. Python migrations must never touch the `app` schema.
3. **No Database Superuser**: Migrations execute under application role privileges (`opspilot_api` and `opspilot_ai`), enforcing security at the DDL layer.

---

## 2. Global Migration Commands

From the monorepo root:

```powershell
# Apply all pending migrations across both Node.js (app) and Python (ai)
npm run db:migrate

# Roll back the most recent migration on both stacks
npm run db:rollback

# Inspect pending migrations in Node.js
npm run db:status
```

---

## 3. Node.js Migration Workflow (`apps/api`)

Powered by `node-pg-migrate`.

### Directory Layout

`apps/api/src/database/migrations/`

- Example: `1700000000000_baseline-app-schema.cjs`

### Creating a New Migration

```powershell
cd apps/api
npm run db:create -- add_tickets_table
```

### Applying Migrations

```powershell
cd apps/api
npm run db:migrate
```

### Rolling Back

```powershell
cd apps/api
npm run db:rollback
```

---

## 4. Python Migration Workflow (`apps/ai-service`)

Powered by `alembic` with async SQLAlchemy (`asyncpg`).

### Directory Layout

`apps/ai-service/alembic/`

- `env.py`: Asynchronous migration runner configured for `version_table_schema="ai"`.
- `versions/`: Migration revisions.
  - Example: `001_baseline_ai_schema.py`

### Creating a New Revision

```powershell
cd apps/ai-service
uv run alembic -c alembic.ini revision -m "create_document_chunks_table"
```

### Applying Migrations

```powershell
cd apps/ai-service
uv run alembic -c alembic.ini upgrade head
```

### Rolling Back

```powershell
cd apps/ai-service
uv run alembic -c alembic.ini downgrade -1
```
