"""Node for finalizing workflow run status, metrics, and persistence state."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState

logger = logging.getLogger(__name__)


async def finalize_run_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Sets definitive workflow lifecycle status and records diagnostics."""
    status = state.get("workflow_status", "running")

    has_proposal = bool(state.get("action_proposal") or state.get("pending_proposal_ids") or state.get("proposal_id"))

    if state.get("human_approval_decision") == "approved":
        status = "completed"
        has_proposal = False
    elif state.get("human_approval_decision") == "rejected" or status == "rejected":
        status = "rejected"
        has_proposal = False
    elif has_proposal:
        status = "awaiting_approval"
    elif status == "blocked" or state.get("policy_approved") is False:
        status = "blocked"
    elif state.get("error_code") and not has_proposal:
        status = "failed"
    elif state.get("execution_error") and not has_proposal:
        status = "failed"
    else:
        status = "completed"

    logger.info(
        f"[WorkflowNode:finalize_run] Run '{state.get('run_id')}' completed with status='{status}'"
    )

    return {
        "current_node": "finalize_run",
        "workflow_status": status,
        "requires_approval": has_proposal,
        "completed_steps_count": len(state.get("completed_steps") or []),
    }
