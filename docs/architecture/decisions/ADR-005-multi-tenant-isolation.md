# ADR-005: Row-Level Tenant Scoping for Multi-Tenancy

## Status
Accepted

## Context
OpsPilot AI is an enterprise SaaS platform where multiple independent organizations store sensitive tickets, operational runbooks, and vector embeddings within shared infrastructure.

## Decision
We implemented row-level tenant scoping where every data entity across schemas `app` and `ai` includes a mandatory `organization_id` foreign key. Middleware resolves tenant context on every request, and database repositories enforce tenant filters on all queries.

## Consequences
- Guaranteed multi-tenant isolation preventing IDOR vulnerabilities.
- Efficient resource utilization without the operational complexity of maintaining thousands of independent databases.
- Simplified aggregation for organization-level metrics and usage quotas.
