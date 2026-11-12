# Redis Infrastructure Configuration

This directory documents the caching and message brokering infrastructure for the OpsPilot AI platform.

## Architecture

- **Engine**: Redis 7
- **Image**: `redis:7-alpine`
- **Default Port**: `127.0.0.1:6379` (strictly bound to localhost)
- **Persistence**: Append-Only File (`appendonly yes`) enabled for durable state retention.

## Logical Database Allocation

Redis provides 16 logical databases (0 - 15). OpsPilot AI partitions them as follows:

- **DB 0**: Node.js Express API (Session caching, rate limiting, and future BullMQ task queues).
- **DB 1**: Python AI Microservice (Ephemeral LLM prompt cache, agent scratchpads, vector search caches).

## Authentication & Security

- Redis requires authentication via the `--requirepass` directive matching `REDIS_PASSWORD`.
- Local development connections are bound strictly to `127.0.0.1` to prevent unauthorized LAN access.
