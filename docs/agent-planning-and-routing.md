# Agent Planning, DAG Validation & Adaptive Routing (Module 13)

## Planning Engine Overview

The planning engine (`PlanningService`) translates user queries and classified intents into structured `MultiStepExecutionPlan` instances. Rather than relying on unstructured ReAct text parsing, the agent leverages JSON schema structured output enforced via Pydantic.

---

## Directed Acyclic Graph (DAG) Plan Schema

Each execution plan consists of bounded, ordered steps:

```python
class PlanStep(BaseModel):
    step_id: str = Field(..., description="Unique step identifier, e.g. 'step_1'")
    tool_name: str = Field(..., description="Approved registered tool identifier")
    action_type: str = Field(..., description="'read' or 'mutation_proposal'")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Validated tool arguments")
    depends_on: List[str] = Field(default_factory=list, description="List of preceding step IDs")
    condition: Optional[str] = Field(None, description="Optional condition required to execute this step")
    expected_output: str = Field(..., description="Anticipated output representation")

class MultiStepExecutionPlan(BaseModel):
    objective: str = Field(..., description="Clear operational objective")
    steps: List[PlanStep] = Field(default_factory=list, max_length=5)
    reasoning: Optional[str] = Field(None, description="Strategic reasoning for the planned sequence")
```

---

## Plan Validation Service (`PlanValidationService`)

Before any execution occurs, `PlanValidationService` validates the plan:

1. **Step Count Verification**: Steps must not exceed `MAX_PLAN_STEPS` (5).
2. **Step ID Uniqueness**: No duplicate `step_id` across the plan.
3. **Approved Tool Membership**: Every `tool_name` must exist in `APPROVED_TOOL_NAMES` and the tool registry.
4. **Action Type Compliance**: `action_type` must be in `('read', 'mutation_proposal', 'propose_mutation')`.
5. **Tool Argument Validation**: Each step's `arguments` dictionary is validated against the tool's Pydantic `input_schema.model_validate(arguments)`.
6. **DAG Dependency Validation**:
   - `depends_on` IDs must exist in previous steps.
   - Self-loops (`step_1` depending on `step_1`) are strictly rejected.
   - Forward references (`step_1` depending on `step_2`) are rejected.
   - Topological sort via Depth-First Search (DFS) ensures no cycles exist in the dependency graph.

---

## Adaptive Replanning (`ProgressService` & `revise_plan`)

When an intermediate step encounters an unexpected or recoverable error (e.g., upstream search service timeout, empty knowledge results, or specific condition triggers):

1. `evaluate_progress` detects the step failure and verifies that `replan_count < MAX_REPLANNING_ATTEMPTS` (2).
2. The workflow routes to `revise_plan`.
3. `PlanningService.revise_plan` is invoked with:
   - The original query and objective.
   - Completed steps and their observations.
   - Failed step ID and failure rationale.
4. A revised plan is generated for remaining steps while preserving all completed work.
5. `replan_count` is incremented.
6. The revised plan is re-validated through `validate_execution_plan` before execution resumes.
7. If `replan_count >= MAX_REPLANNING_ATTEMPTS`, replanning is halted and the run transitions cleanly to `finalize`.
