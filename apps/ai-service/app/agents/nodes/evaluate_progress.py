"""Node for evaluating execution progression and selecting next branch (next_step, replan, finalize)."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.schemas import StepProgressDecision
from app.agents.services.progress_service import progress_service

logger = logging.getLogger(__name__)


async def evaluate_progress_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Assesses intermediate results, remaining steps, and limits to determine next routing action."""
    plan = state.get("execution_plan") or {}
    steps = plan.get("steps", [])
    current_idx = state.get("current_step_index", 0)
    total_steps = len(steps)
    tool_call_count = state.get("tool_call_count", 0)
    replan_count = state.get("replan_count", 0)
    completed_steps = state.get("completed_steps") or []
    failed_steps = state.get("failed_steps") or []
    tool_results = state.get("tool_results") or {}

    evaluation = progress_service.evaluate_step_outcome(
        current_step_index=current_idx,
        total_steps=total_steps,
        tool_call_count=tool_call_count,
        replan_count=replan_count,
        completed_steps=completed_steps,
        failed_steps=failed_steps,
        tool_results=tool_results,
        plan_steps=steps,
    )

    logger.info(
        f"[WorkflowNode:evaluate_progress] Evaluated decision='{evaluation.decision.value}': {evaluation.rationale}"
    )

    if evaluation.decision == StepProgressDecision.NEXT_STEP:
        return {
            "current_node": "evaluate_progress",
            "current_step_index": current_idx + 1,
            "route_target": "next_step",
            "execution_summary": evaluation.rationale,
        }
    elif evaluation.decision == StepProgressDecision.REPLAN:
        return {
            "current_node": "evaluate_progress",
            "route_target": "replan",
            "execution_summary": evaluation.rationale,
        }
    else:  # FINALIZE
        return {
            "current_node": "evaluate_progress",
            "route_target": "finalize",
            "execution_summary": evaluation.rationale,
        }
