# OpsPilot AI — Environment Variable & Configuration Reference

This document provides an exhaustive, security-audited guide to all environment variables consumed across the OpsPilot AI platform.

> [!WARNING]
> Never commit production secrets, private keys, or API tokens to source control. Production environments must inject secrets dynamically via AWS Secrets Manager or secure runtime parameter stores.

---

## 1. Frontend Configuration (`apps/web`)

Client-side environment variables are baked into static bundles at build time using the `VITE_` prefix. **Treat all frontend variables as publicly visible.**

| Variable Name | Required | Default Value | Description | Secret? |
| :--- | :---: | :--- | :--- | :---: |
| `VITE_API_BASE_URL` | Yes | `http://localhost:4000/api/v1` | Public REST API base URL accessed by the browser | No |

---

## 2. Core Node.js API Configuration (`apps/api`)

Validated at application startup using Zod in `apps/api/src/config/env.ts`.

| Variable Name | Required | Default / Example Value | Description | Secret? |
| :--- | :---: | :--- | :--- | :---: |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) | No |
| `PORT` | No | `4000` | HTTP port on which the Express server listens | No |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed origin for CORS and cookie domain matching | No |
| `AI_SERVICE_URL` | Yes | `http://localhost:8000` | Internal address of the Python FastAPI microservice | No |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db?schema=app` | PostgreSQL connection string for `app` schema | **Yes** |
| `DATABASE_POOL_MAX` | No | `20` | Maximum connections in the PostgreSQL pool | No |
| `REDIS_URL` | Yes | `redis://:pass@host:6379/0` | Redis connection URL for BullMQ queues and rate limiters | **Yes** |
| `JWT_ACCESS_SECRET` | Yes | *Min 32 random characters* | Cryptographic HMAC secret for signing JWT access tokens | **Yes** |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Lifetime of issued access tokens | No |
| `REFRESH_TOKEN_EXPIRES_IN`| No | `7d` | Lifetime of refresh token session records | No |
| `REFRESH_COOKIE_NAME` | No | `opspilot_refresh_token` | HTTP-only cookie name storing the refresh token | No |
| `REFRESH_COOKIE_SECURE` | No | `false` (set `true` in prod) | Flag requiring HTTPS transmission for cookie | No |
| `CSRF_COOKIE_NAME` | No | `opspilot_csrf_token` | Cookie name for Double Submit CSRF token | No |
| `DOCUMENT_STORAGE_PROVIDER`| No | `local` (set `s3` in prod) | Storage driver: `local` filesystem or `s3` bucket | No |
| `DOCUMENT_STORAGE_ROOT` | No | `.data/opspilot-uploads` | Local directory for uploaded files when provider is `local` | No |
| `MAX_DOCUMENT_SIZE_MB` | No | `25` | Maximum upload size accepted by Multer | No |
| `AWS_REGION` | No | `us-east-1` | AWS region for S3 document storage | No |
| `AWS_S3_DOCUMENT_BUCKET`| No | `opspilot-documents-private` | Target S3 bucket when storage provider is `s3` | No |
| `AI_SERVICE_INTERNAL_TOKEN`| Yes | *Min 32 random characters* | Shared secret for internal gateway service authorization | **Yes** |

---

## 3. Cognitive AI Microservice Configuration (`apps/ai-service`)

Validated at startup using Pydantic Settings in `apps/ai-service/app/config/settings.py`.

| Variable Name | Required | Default / Example Value | Description | Secret? |
| :--- | :---: | :--- | :--- | :---: |
| `APP_ENV` | No | `development` | Python runtime environment | No |
| `APP_PORT` | No | `8000` | HTTP port on which Uvicorn server listens | No |
| `LOG_LEVEL` | No | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | No |
| `AI_DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host:5432/db` | Async SQLAlchemy database URL for `ai` schema | **Yes** |
| `REDIS_URL` | Yes | `redis://:pass@host:6379/1` | Redis connection URL for AI cache & rate limits | **Yes** |
| `AI_SERVICE_INTERNAL_TOKEN`| Yes | *Min 32 random characters* | Shared secret for verifying callers from Node.js API | **Yes** |
| `CORE_API_URL` | Yes | `http://localhost:4000` | URL for calling Node.js internal tool gateway | No |
| `OPENAI_API_KEY` | Yes | `sk-proj-...` | OpenAI API key for embeddings and LangGraph LLM | **Yes** |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | OpenAI vector embedding model | No |
| `EMBEDDING_DIMENSIONS` | No | `1536` | Dimensions of vector output (pgvector) | No |
| `LLM_MODEL` | No | `gpt-4o-mini` | Default LLM for RAG answers and agent planner | No |

---

## 4. AWS Infrastructure & Terraform Configuration

| Variable Name | Environment | Purpose |
| :--- | :---: | :--- |
| `aws_region` | All | AWS region for all resources (default: `us-east-1`) |
| `environment` | `dev`, `staging`, `production` | Deployment stage tag and resource name prefix |
| `api_image` | Staging / Prod | ECR image URI for Node.js API task |
| `ai_image` | Staging / Prod | ECR image URI for Python AI microservice task |
| `github_repo` | All | GitHub repository name for OIDC role federation |
| `frontend_domain` | Staging / Prod | Optional custom domain for frontend CloudFront distribution |
| `api_certificate_arn` | Staging / Prod | ACM certificate ARN for ALB HTTPS listener |
| `single_nat_gateway` | Dev / Staging | Set to `true` for ~$65/mo savings on idle NAT gateways |
| `rds_instance_class` | All | RDS compute size (`db.t4g.micro` dev, `db.m6g.large` prod) |
| `redis_node_type` | All | ElastiCache compute size (`cache.t4g.micro` dev, `cache.m6g.large` prod) |
