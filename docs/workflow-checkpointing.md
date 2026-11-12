# Workflow Checkpointing & Persistence

## Overview

State persistence allows OpsPilot AI workflows to record fine-grained state transitions, maintain thread conversation context across multiple turns, audit intermediate reasoning steps, and support future human-in-the-loop resumption (Module 14).

Persistence in OpsPilot AI operates at two tiers:

1. **LangGraph Checkpoint Engine**: Utilizes `AsyncPostgresSaver` to persist graph step snapshots and state diffs in PostgreSQL.
2. **Authoritative Workflow Run Repository**: Utilizes `AgentWorkflowRunRepository` and SQLAlchemy to record query metadata, run status, citations, proposals, and execution timing in `ai.agent_workflow_runs`.

---

## Database Architecture

### `ai.agent_workflow_runs`

Created via Alembic migration `006_create_agent_workflow_runs_table.py`:

```sql
CREATE TABLE ai.agent_workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    thread_id VARCHAR(100) NOT NULL,
    workflow_version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    current_step VARCHAR(100),
    total_steps INTEGER DEFAULT 0,
    selected_intent VARCHAR(100),
    selected_tool VARCHAR(100),
    tool_arguments JSONB,
    tool_result JSONB,
    action_proposal JSONB,
    proposal_id VARCHAR(100),
    final_response TEXT,
    citations JSONB DEFAULT '[]'::jsonb,
    error_code VARCHAR(100),
    error_message TEXT,
    duration_ms DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_agent_workflow_runs_org_req UNIQUE (organization_id, request_id)
);
```

### Strategic Indexes

- `ix_agent_workflow_runs_org_id` on `(organization_id)` for tenant isolation and audit queries.
- `ix_agent_workflow_runs_user_id` on `(user_id)` for user operational history.
- `ix_agent_workflow_runs_thread_id` on `(thread_id)` for thread-based conversation tracking.
- `ix_agent_workflow_runs_status` on `(status)` for filtering runs awaiting approval.
- `ix_agent_workflow_runs_created_at` on `(created_at DESC)` for chronological timeline rendering.

---

## Checkpointer Lifecycle

The checkpointer lifecycle is managed in `apps/ai-service/app/agents/persistence/checkpointer.py`:

```python
async def init_workflow_checkpointer() -> BaseCheckpointSaver:
    global _CHECKPOINTER_INSTANCE

    # In test environments, use in-memory checkpointer
    if settings.ENVIRONMENT == "test" or not settings.DATABASE_URL:
        _CHECKPOINTER_INSTANCE = MemorySaver()
        return _CHECKPOINTER_INSTANCE

    # In production, connect AsyncPostgresSaver to PostgreSQL
    connection_kwargs = {
        "autocommit": True,
        "prepare_threshold": 0,
    }

    pool = AsyncConnectionPool(
        conninfo=str(settings.DATABASE_URL),
        max_size=10,
        kwargs=connection_kwargs,
    )
    await pool.open()

    checkpointer = AsyncPostgresSaver(pool)
    await checkpointer.setup()  # Creates checkpoints tables if not present
    _CHECKPOINTER_INSTANCE = checkpointer
    return _CHECKPOINTER_INSTANCE
```

### Graceful Lifecycle in FastAPI

In `apps/ai-service/app/main.py`:

- `lifespan` context manager initializes `init_workflow_checkpointer()` upon server startup.
- `close_workflow_checkpointer()` cleanly flushes open database connections upon server shutdown.
