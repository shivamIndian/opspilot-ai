"""Node for observing, recording, and structuring intermediate tool outputs."""

import logging
from typing import Dict, Any, List
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState

logger = logging.getLogger(__name__)


async def observe_tool_result_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Records the executed step's output into state history, citations, and proposal registries."""
    plan = state.get("execution_plan") or {}
    steps = plan.get("steps", [])
    current_idx = state.get("current_step_index", 0)

    if current_idx >= len(steps):
        return {
            "current_node": "observe_tool_result",
        }

    step = steps[current_idx]
    step_id = step.get("step_id", f"step_{current_idx + 1}")
    tool_name = step.get("tool_name", "")

    tool_result = state.get("tool_result") or {}
    tool_results = dict(state.get("tool_results") or {})
    tool_results[step_id] = tool_result

    completed_steps = list(state.get("completed_steps") or [])
    failed_steps = list(state.get("failed_steps") or [])
    pending_proposals = list(state.get("pending_proposal_ids") or [])

    is_failed = tool_result.get("failed", False) or "error" in tool_result

    if is_failed:
        logger.warning(f"[WorkflowNode:observe_tool_result] Step '{step_id}' recorded as failed.")
        if step_id not in failed_steps:
            failed_steps.append(step_id)
    else:
        logger.info(f"[WorkflowNode:observe_tool_result] Step '{step_id}' ({tool_name}) recorded as completed.")
        if step_id not in completed_steps:
            completed_steps.append(step_id)

    # If knowledge search was executed, capture retrieved sources for citation grounding
    retrieved_sources = list(state.get("retrieved_sources") or [])
    citation_data = list(state.get("citation_data") or [])
    insufficient_evidence = state.get("insufficient_evidence", False)

    if tool_name == "search_knowledge_base":
        passages = tool_result.get("passages") or tool_result.get("chunks") or []
        if isinstance(passages, list) and passages:
            for p in passages:
                retrieved_sources.append(p)
                citation_data.append(p)
            insufficient_evidence = False
        else:
            insufficient_evidence = True

    # If a mutation proposal was generated, track proposal ID
    action_proposal = state.get("action_proposal")
    if action_proposal and isinstance(action_proposal, dict):
        prop_id = action_proposal.get("proposal_id")
        if prop_id and prop_id not in pending_proposals:
            pending_proposals.append(prop_id)

    return {
        "current_node": "observe_tool_result",
        "tool_results": tool_results,
        "completed_steps": completed_steps,
        "completed_steps_count": len(completed_steps),
        "failed_steps": failed_steps,
        "pending_proposal_ids": pending_proposals,
        "retrieved_sources": retrieved_sources,
        "citation_data": citation_data,
        "insufficient_evidence": insufficient_evidence,
    }
