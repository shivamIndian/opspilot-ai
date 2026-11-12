# Module 02: Database & Infrastructure Setup

## 1. Overview
Module 02 established the PostgreSQL 16 relational and vector infrastructure (`pgvector`) and Redis 7 cache and messaging backbone.

## 2. Scope & Implementation
- **Schema Separation**: Strict isolation between `app` (owned by `opspilot_api`) and `ai` (owned by `opspilot_ai`).
- **Connection Pools**: Node.js `pg.Pool` with connection timeouts and Python async SQLAlchemy engine (`asyncpg`).
- **Redis Integration**: Node.js `ioredis` client and Python `redis.asyncio` client with connection retry backoffs.
- **Dual Migrations**: `node-pg-migrate` for Node.js schema and Alembic for Python AI schema.
- **Readiness Probes**: `/health/ready` endpoints verifying database and Redis connectivity.

## 3. Status
- **Status**: Complete (100% verified).
