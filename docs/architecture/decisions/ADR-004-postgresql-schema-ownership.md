# ADR-004: Dual PostgreSQL Schema Ownership (`app` vs `ai`)

## Status
Accepted

## Context
In polyglot multi-service platforms sharing a single PostgreSQL cluster, unchecked cross-service database access can cause migration race conditions, schema drift, and brittle coupling.

## Decision
We enforce strict schema and database role separation:
- Role `opspilot_api` owns schema `app` (migrated by `node-pg-migrate`).
- Role `opspilot_ai` owns schema `ai` (migrated by `alembic`).
- Neither service is granted permissions to query or alter the other service's schema. Cross-service interactions occur strictly over authenticated internal HTTP APIs.

## Consequences
- Guaranteed zero migration collisions during deployment.
- Independent schema evolution and rollbacks.
- Least-privilege database user credentials prevent unintended data mutations.
