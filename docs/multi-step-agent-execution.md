# Multi-Step Agent Execution Architecture (Module 13)

## Overview

Module 13 extends the single-step LangGraph execution graph from Module 12 into a robust, bounded, stateful multi-step operational agent. The agent can formulate a Directed Acyclic Graph (DAG) plan of up to 5 steps, execute sequential or conditionally chained tools, dynamically evaluate intermediate execution outcomes, and safely trigger adaptive replanning without exceeding hard execution boundaries.

---

## Architecture & Data Flow

```
+---------------------------------------------------------------------------------------------+
|                                    START (User Query & JWT)                                 |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
|                                      validate_input                                         |
|  - Sanitizes user input, verifies organization UUID, initializes multi-step counters        |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
|                                  create_execution_plan                                      |
|  - Invokes LLM planner with strict MultiStepExecutionPlan Pydantic schema                   |
|  - Deterministic fallback plan if LLM is offline or query is malformed                      |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
|                                 validate_execution_plan                                     |
|  - Validates DAG invariants: max 5 steps, approved tool names, no self-loops, no cycles     |
|  - Strongly typed Pydantic input schema validation for every step arguments                 |
+---------------------------------------------------------------------------------------------+
                                              |
                     +------------------------+------------------------+
                     | (Plan Valid)                                    | (Plan Validation Error)
                     v                                                 v
+-----------------------------------------------------+   +------------------------------------+
|                  policy_evaluation                  |   |      generate_final_response       |
|  - Verifies delegation scopes for planned tools     |   +------------------------------------+
+-----------------------------------------------------+
                     |
         +-----------+-----------+
         | (Approved)            | (Blocked)
         v                       v
+-----------------------------------------------------+   +------------------------------------+
|                  execute_next_step                  |   |      generate_final_response       |
|  - Dispatches tool via Module 11 execution engine   |   +------------------------------------+
|  - Mutation tools enforce proposal-only generation  |
+-----------------------------------------------------+
         |
         v
+-----------------------------------------------------+
|                 observe_tool_result                 |
|  - Captures outputs, passages, proposals, errors    |
|  - Increments completed / failed step tracking      |
+-----------------------------------------------------+
         |
         v
+-----------------------------------------------------+
|                  evaluate_progress                  |
|  - ProgressService assesses remaining steps & limits|
+-----------------------------------------------------+
         |
         +-----------------------+----------------------+
         | (Decision: NEXT_STEP) | (Decision: REPLAN)   | (Decision: FINALIZE)
         |                       |                      |
         v                       v                      v
+--------------------+  +--------------------+  +------------------------------------+
| execute_next_step  |  |    revise_plan     |  |      generate_final_response       |
+--------------------+  +--------------------+  +------------------------------------+
                                 |                                 |
                                 v                                 v
                        +--------------------+          +------------------------------------+
                        | validate_execution |          |         validate_response          |
                        |       _plan        |          +------------------------------------+
                        +--------------------+                     |
                                                                   v
                                                        +------------------------------------+
                                                        |            finalize_run            |
                                                        |  - Persists telemetry to DB repo   |
                                                        +------------------------------------+
                                                                   |
                                                                   v
                                                        +------------------------------------+
                                                        |                END                 |
                                                        +------------------------------------+
```

---

## State Model (`OpsPilotWorkflowState`)

Multi-step state management leverages the following keys in `OpsPilotWorkflowState`:

| State Field | Type | Description |
|:---|:---|:---|
| `execution_plan` | `Dict[str, Any]` | Serialized `MultiStepExecutionPlan` containing current DAG steps |
| `current_step_index`| `int` | Zero-based index of the currently active step |
| `total_steps` | `int` | Total count of steps in the active plan (max 5) |
| `completed_steps` | `List[str]` | List of step IDs completed successfully |
| `completed_steps_count` | `int` | Monotonically increasing count of completed steps |
| `failed_steps` | `List[str]` | List of step IDs that produced errors or failed execution |
| `tool_call_count` | `int` | Cumulative tool execution invocations across the run (max 8) |
| `replan_count` | `int` | Cumulative count of plan revisions triggered (max 2) |
| `tool_results` | `Dict[str, Any]` | Map of `step_id -> tool_result_dict` preserving intermediate findings |
| `action_proposal` | `Optional[Dict]` | Last prepared mutation proposal awaiting human approval |
| `pending_proposal_ids` | `List[str]` | Tracked proposal UUIDs awaiting human review |
| `execution_summary`| `str` | High-level synthesis of multi-step execution milestones |

---

## Mutation Tool Proposal Safeguard

Under NO circumstances does Module 13 write directly to the operational database for mutation tools (`create_support_ticket`, `update_support_ticket`).
When a mutation tool is scheduled in the execution plan:
1. `execute_next_step` detects `action_type in ("mutation_proposal", "propose_mutation")`.
2. The tool produces an immutable `ToolActionProposal` marked `status="awaiting_approval"`.
3. The proposal is registered in `state["action_proposal"]` and `state["pending_proposal_ids"]`.
4. The workflow status is transitioned to `"awaiting_approval"`.
5. Direct database mutation is deferred to authorized human approval in Module 14.
