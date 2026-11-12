"""Node for bounded, adaptive replanning while preserving completed side effects and read history."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.schemas import MultiStepExecutionPlan
from app.agents.constants import MAX_REPLANNING_ATTEMPTS
from app.agents.services.planning_service import planning_service
from app.agents.services.plan_validation_service import PlanValidationService

logger = logging.getLogger(__name__)


async def revise_plan_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Revises unexecuted plan steps to adapt to intermediate failures or discovered state."""
    replan_count = state.get("replan_count", 0) + 1

    if replan_count > MAX_REPLANNING_ATTEMPTS:
        logger.warning(
            f"[WorkflowNode:revise_plan] Max replan attempts ({MAX_REPLANNING_ATTEMPTS}) exceeded. Halting replanning."
        )
        return {
            "current_node": "revise_plan",
            "replan_count": replan_count,
            "route_target": "finalize",
        }

    plan_dict = state.get("execution_plan") or {}
    completed_steps = state.get("completed_steps") or []
    tool_results = state.get("tool_results") or {}
    replan_reason = state.get("execution_summary") or "Intermediate tool failure or state change."

    try:
        current_plan = MultiStepExecutionPlan(**plan_dict)
        revised_plan = await planning_service.revise_plan(
            original_plan=current_plan,
            completed_steps=completed_steps,
            tool_results=tool_results,
            replan_reason=replan_reason,
        )

        logger.info(
            f"[WorkflowNode:revise_plan] Plan successfully revised ({len(revised_plan.steps)} steps) "
            f"on attempt {replan_count}/{MAX_REPLANNING_ATTEMPTS}."
        )

        # Resume execution at next pending step index
        next_step_index = min(len(completed_steps), len(revised_plan.steps) - 1)

        return {
            "current_node": "revise_plan",
            "execution_plan": revised_plan.model_dump(),
            "total_steps": len(revised_plan.steps),
            "current_step_index": next_step_index,
            "replan_count": replan_count,
            "route_target": "next_step",
        }

    except Exception as e:
        logger.error(f"[WorkflowNode:revise_plan] Replanning failed: {e}. Finalizing run with partial progress.", exc_info=True)
        return {
            "current_node": "revise_plan",
            "replan_count": replan_count,
            "route_target": "finalize",
            "error_code": "REPLANNING_FAILED",
        }
