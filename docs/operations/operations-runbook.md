# OpsPilot AI — Production Operations Runbook

## 1. Service Health & Readiness Endpoints

| Service | Endpoint | Success Response | Failure Response | Check Action |
| :--- | :--- | :---: | :---: | :--- |
| **Node.js API** | `GET /health/live` | 200 OK | Process unresponsive | Liveness check |
| **Node.js API** | `GET /health/ready` | 200 OK | 503 Service Unavailable | Checks Postgres pool and Redis ping |
| **Python AI** | `GET /health/live` | 200 OK | Process unresponsive | Liveness check |
| **Python AI** | `GET /health/ready` | 200 OK | 503 Service Unavailable | Checks asyncpg engine and Redis ping |
| **Web SPA** | `GET /healthz` | 200 OK | Nginx connection failure | Nginx static server health |

---

## 2. Common Operational Incidents & Mitigations

### 2.1 Database Connection Pool Saturation
- **Symptom**: CloudWatch alarm `api_5xx` fires; logs display `TimeoutError: ResourceRequest timed out`.
- **Diagnosis**:
  ```bash
  # Check active PostgreSQL connections
  SELECT count(*), state FROM pg_stat_activity GROUP BY state;
  ```
- **Remediation**:
  1. Increase `DATABASE_POOL_MAX` in task definition if RDS instance CPU and memory allow.
  2. Scale down stuck background workers or restart stalled ECS tasks.

### 2.2 Redis Queue Backlog (BullMQ Worker Lag)
- **Symptom**: Document processing or embedding status remains `pending` for > 5 minutes.
- **Diagnosis**:
  ```bash
  # Check BullMQ queue waiting jobs via redis-cli
  redis-cli -a $REDIS_PASSWORD -p 6379 LLEN bull:opspilot-document-processing:wait
  redis-cli -a $REDIS_PASSWORD -p 6379 LLEN bull:opspilot-document-embeddings:wait
  ```
- **Remediation**:
  1. Check worker logs in CloudWatch `/ecs/opspilot-workers`.
  2. Scale out worker replicas: `aws ecs update-service --cluster opspilot-cluster --service opspilot-workers-svc --desired-count 4`.

### 2.3 LLM Provider Rate Limiting (HTTP 429)
- **Symptom**: AI responses fail with `EMBEDDING_RATE_LIMITED` or `LLM_RATE_LIMITED`.
- **Diagnosis**: OpenAI organization TPM (Tokens Per Minute) limit exceeded.
- **Remediation**:
  1. Exponential backoff automatically handles transient rate limits up to 3 attempts.
  2. For sustained high load, request tier limit increase in the OpenAI dashboard or switch to a secondary API key in AWS Secrets Manager.

### 2.4 Stalled Human Approval Outbox Dispatch
- **Symptom**: Approved ticket priority is not updated on the ticket board.
- **Diagnosis**: Outbox record remains `PROPOSAL_APPROVED` without executing.
- **Remediation**:
  1. Inspect `app.agent_workflow_outbox` for `status = 'failed'`.
  2. Trigger outbox worker manually: `node apps/api/dist/workers/agent-approval-outbox.worker.js`.
