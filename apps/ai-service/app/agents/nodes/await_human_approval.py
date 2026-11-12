"""Node for suspending workflow via interrupt() awaiting human approval and handling resumption (Module 14)."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt

from app.agents.state import OpsPilotWorkflowState

logger = logging.getLogger(__name__)


async def await_human_approval_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Suspends the LangGraph thread using interrupt() until an external human approval resume signal is delivered."""
    action_proposal = state.get("action_proposal") or {}
    proposal_id = state.get("proposal_id") or action_proposal.get("proposal_id", "prop-unknown")
    tool_name = action_proposal.get("tool_name", state.get("selected_tool", "action"))
    proposed_action = action_proposal.get("proposed_action", {})

    logger.info(
        f"[WorkflowNode:await_human_approval] Interrupting run '{state.get('run_id')}' for proposal '{proposal_id}' ({tool_name})"
    )

    # Suspend execution thread in checkpointer until Command(resume=...) is passed
    resume_payload: Dict[str, Any] = interrupt({
        "status": "awaiting_approval",
        "proposal_id": proposal_id,
        "tool_name": tool_name,
        "action": proposed_action.get("action", tool_name),
        "proposed_action": proposed_action,
        "risk_level": action_proposal.get("risk_level", "high"),
    })

    logger.info(
        f"[WorkflowNode:await_human_approval] Resumed run '{state.get('run_id')}' with decision payload: {resume_payload}"
    )

    decision = resume_payload.get("decision", "rejected") if isinstance(resume_payload, dict) else "rejected"
    execution_result = resume_payload.get("execution_result") if isinstance(resume_payload, dict) else None
    decided_by = resume_payload.get("decided_by") if isinstance(resume_payload, dict) else None
    decision_reason = resume_payload.get("decision_reason") if isinstance(resume_payload, dict) else None

    # Track completed proposals
    pending = [p for p in state.get("pending_proposal_ids", []) if p != proposal_id]
    completed = list(state.get("completed_proposal_ids", []))
    if proposal_id not in completed:
        completed.append(proposal_id)

    if decision == "approved":
        status = "completed"
        summary = f"Human operator approved proposal '{proposal_id}'. Business action was executed successfully."
    else:
        status = "rejected"
        summary = f"Human operator rejected proposal '{proposal_id}'. Reason: {decision_reason or 'No reason provided.'}"

    return {
        "current_node": "await_human_approval",
        "workflow_status": status,
        "requires_approval": False,
        "human_approval_decision": decision,
        "approval_decided_by": decided_by,
        "approval_decision_reason": decision_reason,
        "execution_result": execution_result,
        "pending_proposal_ids": pending,
        "completed_proposal_ids": completed,
        "execution_summary": summary,
    }
