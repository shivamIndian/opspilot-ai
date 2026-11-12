# ADR-002: Express 4 & TypeScript Core Backend

## Status
Accepted

## Context
The core business gateway requires low latency, mature asynchronous I/O, robust middleware chains for security (Helmet, rate limiting, CSRF), and seamless ecosystem integrations for PostgreSQL (`pg.Pool`) and Redis queues (`BullMQ`).

## Decision
We implemented the core API gateway in Node.js 22 using Express 4 and TypeScript 5. Business logic is organized into modular domains (`auth`, `organizations`, `tickets`, `documents`, `agent-approvals`).

## Consequences
- Single-language TypeScript type sharing across repositories.
- High-throughput asynchronous request handling.
- Express middleware enables clean, sequential security policies (auth &rarr; org context &rarr; RBAC &rarr; rate limit &rarr; validator).
