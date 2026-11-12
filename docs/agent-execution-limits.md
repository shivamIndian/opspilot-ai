# Agent Execution Limits & Safety Guards (Module 13)

## Centralized Execution Constraints

To protect enterprise infrastructure from runaway recursion, unbounded tool loops, resource exhaustion, and unauthorized mutations, Module 13 enforces centralized limits in `apps/ai-service/app/agents/constants.py` and `app/config/settings.py`.

---

## Configuration Parameter Reference

| Constant | Default Value | Enforcing Node / Service | Impact when Exceeded |
|:---|:---:|:---|:---|
| `MAX_PLAN_STEPS` | `5` | `MultiStepExecutionPlan`, `PlanValidationService` | Plan rejected with `PlanStepLimitExceededError` |
| `MAX_TOOL_CALLS_PER_RUN` | `8` | `execute_next_step`, `ProgressService` | Execution halts immediately, routing to `finalize` |
| `MAX_REPLANNING_ATTEMPTS` | `2` | `ProgressService`, `evaluate_progress` | Halts replanning, routes to `finalize` with partial outputs |
| `MAX_MUTATION_PROPOSALS_PER_RUN` | `2` | `execute_next_step`, `observe_tool_result` | Rejects subsequent proposals |
| `MAX_TOOL_RETRIES` | `2` | `ToolExecutionEngine` | Non-fatal tool failure recorded |
| `MAX_WORKFLOW_DURATION_SECONDS` | `180` | `WorkflowExecutionService` | Workflow run canceled with timeout error |

---

## Multi-Tenancy & Authorization Isolation

- **Delegated Authorization**: All tool invocations require user JWT tokens propagated strictly via `ToolExecutionContext`.
- **Policy Enforcement**: `policy_evaluation_node` verifies that the caller possesses required scopes (`tools:knowledge:read`, `tools:tickets:read`, `tools:tickets:write`, `tools:users:read`, `tools:history:read`) for all tools designated in the DAG plan before executing any step.
- **Tenant Scoping**: All tool operations and repository queries strictly enforce `organization_id` predicates.
- **Audit Logging**: Every tool execution and proposal generation is asynchronously audited via `ToolAuditLogger`.
