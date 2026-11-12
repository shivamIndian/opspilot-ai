# OpsPilot AI — Infrastructure Setup & Docker Compose Guide

This guide details the local infrastructure orchestration for PostgreSQL 16 (with pgvector) and Redis 7.

---

## 1. Architecture & Port Bindings

```
Local Host (127.0.0.1)
 │
 ├── 127.0.0.1:5432  ──► opspilot-postgres (pgvector/pgvector:pg16)
 │                         └── Volume: opspilot_postgres_data
 │
 └── 127.0.0.1:6379  ──► opspilot-redis (redis:7-alpine)
                           └── Volume: opspilot_redis_data
```

> **Security Note**: Ports are bound strictly to `127.0.0.1` (`127.0.0.1:5432:5432` and `127.0.0.1:6379:6379`) to prevent local development database and cache ports from being exposed over local network interfaces.

---

## 2. Infrastructure Management Commands

All infrastructure commands are managed through root npm scripts:

| Action                    | NPM Script             | Docker Compose Equivalent |
| :------------------------ | :--------------------- | :------------------------ |
| **Start Infrastructure**  | `npm run infra:up`     | `docker compose up -d`    |
| **Stop Infrastructure**   | `npm run infra:down`   | `docker compose down`     |
| **Check Health & Status** | `npm run infra:status` | `docker compose ps`       |
| **Stream Live Logs**      | `npm run infra:logs`   | `docker compose logs -f`  |

---

## 3. Persistent Volumes & Initialization Behavior

Two persistent named Docker volumes are declared:

- `opspilot_postgres_data`: Persists `/var/lib/postgresql/data` across container stops and machine reboots.
- `opspilot_redis_data`: Persists `/data` (Append-Only File state).

### First-Time Initialization vs. Existing Volumes

- When the PostgreSQL container boots with an **empty** volume, entrypoint scripts in `/docker-entrypoint-initdb.d/` (`infrastructure/postgres/init/01-init.sh`) run automatically to configure roles, schemas, and permissions.
- When the volume **already exists**, PostgreSQL skips `/docker-entrypoint-initdb.d/` to avoid overwriting existing data.
- **Factory Reset (Destructive)**:
  ```powershell
  # Stops containers and destroys persistent volumes
  docker compose down -v
  docker compose up -d
  ```

---

## 4. Verification Workflow

Once Docker containers are running, execute the verification scripts:

### Node.js Backend Verification

```powershell
cd apps/api
npx tsx src/database/verify.ts
npx tsx src/redis/verify.ts
```

### Python AI Service Verification

```powershell
cd apps/ai-service
uv run python -m app.database.verify
```

---

## 5. Troubleshooting Common Issues

### 1. Docker Desktop Daemon Not Running

- **Symptom**: `error during connect: Get "...dockerDesktopLinuxEngine...": The system cannot find the file specified.`
- **Resolution**: Launch Docker Desktop from the Start menu or run:
  ```powershell
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  ```
  Wait approximately 30 seconds for the Linux engine to initialize before running `npm run infra:up`.

### 2. Port Conflicts (Port 5432 or 6379 in Use)

- **Symptom**: `Bind for 127.0.0.1:5432 failed: port is already allocated.`
- **Resolution**: Check which process is occupying the port:
  ```powershell
  Get-NetTCPConnection -LocalPort 5432, 6379 | Select-Object LocalPort, State, OwningProcess
  ```
  Stop conflicting local PostgreSQL or Redis services if already installed on the host.

### 3. Password Authentication Failure

- **Symptom**: `password authentication failed for user "opspilot_api"`
- **Resolution**: Ensure passwords in `apps/api/.env` and `apps/ai-service/.env` match the environment credentials specified in the root `.env` used by Docker Compose.
