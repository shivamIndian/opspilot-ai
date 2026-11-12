"""Node for generating mutation proposals awaiting human approval without executing writes."""

import logging
import uuid
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.tools.executor import get_tool_execution_engine
from app.tools.schemas import ExecuteToolRequest

logger = logging.getLogger(__name__)


async def propose_mutation_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Prepares structured action proposal. GUARANTEES zero database mutation in Module 12."""
    context: Optional[WorkflowContext] = config.get("configurable", {}).get("context")
    tool_name = state.get("selected_tool")
    tool_args = state.get("tool_arguments") or {}

    if not tool_name:
        return {
            "current_node": "propose_mutation",
            "workflow_status": "failed",
            "error_code": "WORKFLOW_PLAN_INVALID",
        }

    execution_id = f"exec-{uuid.uuid4().hex[:12]}"
    engine = get_tool_execution_engine()

    req = ExecuteToolRequest(
        tool_name=tool_name,
        arguments=tool_args,
        request_id=state.get("request_id", str(uuid.uuid4())),
        execution_id=execution_id,
        authenticated_user_id=context.authenticated_user_id if context else "",
        organization_id=context.organization_id if context else state.get("organization_id", ""),
        delegated_authorization_token=context.delegated_authorization_token if context else "",
        permitted_scopes=context.permitted_scopes if context else ["tools:tickets:write"],
        platform_role=context.organization_role if context else "member",
        correlation_id=context.correlation_id if context else None,
    )

    resp = await engine.execute(req)

    proposal_data = None
    proposal_id = None

    if resp.success and resp.proposal:
        proposal_data = resp.proposal.model_dump()
        proposal_id = resp.proposal.proposal_id
        logger.info(
            f"[WorkflowNode:propose_mutation] Generated proposal '{proposal_id}' for tool '{tool_name}' (run='{state.get('run_id')}')"
        )
    else:
        logger.warning(
            f"[WorkflowNode:propose_mutation] Proposal generation failed for '{tool_name}': {resp.error}"
        )

    return {
        "current_node": "propose_mutation",
        "proposed_action": proposal_data.get("proposed_action") if proposal_data else None,
        "proposal_id": proposal_id,
        "requires_approval": True,
        "workflow_status": "awaiting_approval" if resp.success else "failed",
        "execution_error": resp.error if not resp.success else None,
    }
