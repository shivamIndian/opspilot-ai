# Module 22: AI Agent Monitoring & Observability Documentation

## 1. Overview & Architecture

Module 22 implements enterprise AI Agent Monitoring and Observability across OpsPilot AI. It provides platform administrators, security operators, and SRE teams with real-time insight into autonomous LangGraph agent workflows, tool invocations, execution duration, and human-in-the-loop pauses.

### Key Capabilities
1. **Aggregated Operational Metrics Dashboard**:
   - Total Workflows, Success Rate %, In-Flight / Running, Waiting for Approval, Average Duration / Latency, and Tool Invocations.
   - Built on real database aggregates in PostgreSQL (`ai.agent_workflow_runs`). Zero fabricated metrics.
2. **Paginated Workflow Runs Inspection**:
   - Filterable by status (`all`, `completed`, `waiting_approval`, `failed`, `running`).
   - Searchable across intent, tool name, and conversation thread ID.
   - Displays execution duration, completed/total steps, tool count, and timestamps.
   - Deep links directly into human review if an approval is pending (`/organizations/:orgId/approvals/:proposalId`).
3. **Dedicated Run Lifecycle Inspection (`WorkflowRunDetailPage`)**:
   - Real-time status badge and thread metadata.
   - Telemetry grid (Duration, Steps, Tool, Citations).
   - Structured visual lifecycle timeline (`WorkflowTimeline`): Start &rarr; Plan Created &rarr; Tool Invocation &rarr; Human Approval Interruption &rarr; Completion / Failure.
   - Synthesized answer output with citation count.
4. **Tool Execution Frequency Breakdown**:
   - Live analytics on most frequently invoked tools.
   - Tracks how many executions triggered high-risk mutation proposals requiring human sign-off.
5. **Security, Privacy & Multi-Tenancy**:
   - Strict organization isolation across database, Python AI service, Node.js API, and frontend.
   - Internal prompts, hidden chain-of-thought, and provider credentials remain strictly private and redacted.
   - Role-based access control enforces `owner` and `admin` permission for monitoring data.

---

## 2. API Endpoints

### Node.js API Gateway (`/api/v1/organizations/:organizationId/agent-monitoring`)
- `GET /overview`: Returns high-level operational KPIs and recent runs.
- `GET /runs`: Returns paginated, filtered workflow runs.
- `GET /runs/:runId`: Returns comprehensive execution details for a specific run.
- `GET /runs/:runId/events`: Synthesizes safe, structured lifecycle timeline events.
- `GET /tool-executions`: Returns tool invocation volume and proposed action statistics.

### Python AI Internal Microservice (`/internal/v1/agent/workflows`)
- `GET /analytics/summary`: Computes aggregate execution KPIs scoped by tenant organization UUID.
- `GET /runs`: Queries PostgreSQL `ai.agent_workflow_runs` with pagination, filtering, and ordering.
- `GET /{run_id}`: Retrieves individual workflow telemetry and state checkpoint records.

---

## 3. Verification & Testing

- **Python AI Microservice (`tests/test_workflow.py`)**:
  - `test_list_workflow_runs_endpoint`: Validates tenant isolation and pagination.
  - 166/166 passing pytest tests.
- **Node.js Express API (`apps/api/tests/agent-monitoring.test.ts`)**:
  - Validates KPI aggregates, member authorization guard (403), run list pagination, run details, lifecycle timeline event synthesis, and tool execution frequency.
  - 6/6 tests passing (234/234 total in `@opspilot/api`).
- **React Frontend (`apps/web/tests/agent-monitoring.test.tsx`)**:
  - Validates dashboard KPI cards, tool distribution bars, workflow runs table filtering, and run detail timeline view.
  - 4/4 tests passing (66/66 total in `@opspilot/web`).
- **Production Build**:
  - `tsc --noEmit` &rarr; 0 errors across API and Web workspaces.
  - Vite build &rarr; Succeeded in 8.17s.
