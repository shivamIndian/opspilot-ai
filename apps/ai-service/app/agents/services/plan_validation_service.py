"""Validation service for structured multi-step execution plans."""

import logging
from typing import Set, Dict, List
from app.agents.schemas import MultiStepExecutionPlan, PlanStep
from app.agents.constants import (
    MAX_PLAN_STEPS,
    APPROVED_TOOL_NAMES,
    ALLOWED_ACTION_TYPES,
)
from app.agents.exceptions import (
    PlanValidationError,
    PlanStepLimitExceededError,
    PlanUnknownDependencyError,
    PlanDependencyCycleError,
)
from app.tools.registry import get_tool_registry

logger = logging.getLogger(__name__)


class PlanValidationService:
    """Enforces strict structural, dependency, and tool-schema safety rules on execution plans."""

    @classmethod
    def validate_plan(cls, plan: MultiStepExecutionPlan) -> None:
        """Validates an entire multi-step plan against all safety invariants.

        Raises:
            PlanStepLimitExceededError: If steps exceed MAX_PLAN_STEPS.
            PlanValidationError: If steps are empty, tool names are unknown, or step IDs duplicate.
            PlanUnknownDependencyError: If a step depends on an undeclared step ID.
            PlanDependencyCycleError: If a dependency cycle is detected.
        """
        if not plan.steps:
            raise PlanValidationError(
                message="Execution plan must contain at least one step",
                details={"step_count": 0},
            )

        if len(plan.steps) > MAX_PLAN_STEPS:
            raise PlanStepLimitExceededError(
                message=f"Plan step count ({len(plan.steps)}) exceeds configured maximum of {MAX_PLAN_STEPS}",
                details={"step_count": len(plan.steps), "max_steps": MAX_PLAN_STEPS},
            )

        registry = get_tool_registry()
        seen_step_ids: Set[str] = set()
        step_id_order: Dict[str, int] = {}

        # 1. First pass: Validate uniqueness, tool registry membership, and action types
        for idx, step in enumerate(plan.steps):
            step_id = step.step_id.strip()

            if not step_id:
                raise PlanValidationError(
                    message=f"Step at index {idx} has an empty step_id",
                    details={"index": idx},
                )

            if step_id in seen_step_ids:
                raise PlanValidationError(
                    message=f"Duplicate step_id '{step_id}' found in execution plan",
                    details={"duplicate_step_id": step_id},
                )

            seen_step_ids.add(step_id)
            step_id_order[step_id] = idx

            # Tool name validation
            cleaned_tool = step.tool_name.strip().lower()
            if cleaned_tool not in APPROVED_TOOL_NAMES and not registry.has(cleaned_tool):
                raise PlanValidationError(
                    message=f"Tool '{step.tool_name}' in step '{step_id}' is not an approved registered tool",
                    details={"step_id": step_id, "unknown_tool": step.tool_name},
                )

            # Action type validation
            if step.action_type not in ALLOWED_ACTION_TYPES:
                raise PlanValidationError(
                    message=f"Action type '{step.action_type}' in step '{step_id}' is not allowed",
                    details={"step_id": step_id, "invalid_action_type": step.action_type},
                )

            # Tool schema validation if tool exists in registry
            if registry.has(cleaned_tool):
                tool_def = registry.get(cleaned_tool)
                try:
                    tool_def.input_schema.model_validate(step.arguments or {})
                except Exception as e:
                    logger.warning(f"[PlanValidator] Argument validation error for {cleaned_tool}: {e}")
                    raise PlanValidationError(
                        message=f"Invalid arguments for tool '{cleaned_tool}' in step '{step_id}': {str(e)}",
                        details={"step_id": step_id, "tool": cleaned_tool, "error": str(e)},
                    )

        # 2. Second pass: Validate DAG dependencies (no forward references, no unknown references, no cycles)
        cls._validate_dependencies(plan.steps, step_id_order)

    @classmethod
    def _validate_dependencies(cls, steps: List[PlanStep], step_id_order: Dict[str, int]) -> None:
        """Validates that step dependencies form a strict Directed Acyclic Graph (DAG)."""
        adjacency: Dict[str, List[str]] = {s.step_id: [] for s in steps}

        for step in steps:
            current_id = step.step_id
            current_idx = step_id_order[current_id]

            for dep_id in step.depends_on:
                dep_id = dep_id.strip()

                if dep_id not in step_id_order:
                    raise PlanUnknownDependencyError(
                        message=f"Step '{current_id}' references unknown dependency '{dep_id}'",
                        details={"step_id": current_id, "unknown_dependency": dep_id},
                    )

                if dep_id == current_id:
                    raise PlanDependencyCycleError(
                        message=f"Step '{current_id}' cannot depend on itself",
                        details={"step_id": current_id},
                    )

                dep_idx = step_id_order[dep_id]
                # Enforce sequential order: dependency must precede current step
                if dep_idx >= current_idx:
                    raise PlanDependencyCycleError(
                        message=f"Step '{current_id}' has forward or cyclic dependency on '{dep_id}'",
                        details={"step_id": current_id, "forward_dependency": dep_id},
                    )

                adjacency[dep_id].append(current_id)

        # Topological cycle detection (Tarjan / DFS cycle detection)
        visited: Dict[str, int] = {s.step_id: 0 for s in steps}  # 0=unvisited, 1=visiting, 2=visited

        def dfs(node: str) -> None:
            visited[node] = 1  # visiting
            for neighbor in adjacency.get(node, []):
                if visited[neighbor] == 1:
                    raise PlanDependencyCycleError(
                        message=f"Cyclic dependency detected between steps involving '{node}' and '{neighbor}'",
                        details={"cycle_node": node, "dependent": neighbor},
                    )
                if visited[neighbor] == 0:
                    dfs(neighbor)
            visited[node] = 2  # finished

        for step in steps:
            if visited[step.step_id] == 0:
                dfs(step.step_id)


plan_validation_service = PlanValidationService()
