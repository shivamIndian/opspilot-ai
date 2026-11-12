"""Node for evaluating tenant, role, and delegation permissions across all planned steps."""

import logging
from typing import Dict, Any, List
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext

logger = logging.getLogger(__name__)

# Required scopes mapping for approved tools (supports both standard and tools: scoped conventions)
TOOL_SCOPE_REQUIREMENTS: Dict[str, List[str]] = {
    "search_knowledge_base": ["knowledge:read", "tools:knowledge:read", "tools:read"],
    "get_ticket_details": ["tickets:read", "tools:tickets:read", "tools:read"],
    "summarize_support_history": ["tickets:read", "tools:tickets:read", "tools:history:read", "tools:read"],
    "search_user_information": ["users:read", "tools:users:read", "tools:read"],
    "create_support_ticket": ["tickets:write", "tools:tickets:write"],
    "update_support_ticket": ["tickets:write", "tools:tickets:write"],
}


async def policy_evaluation_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Evaluates whether the executing user's delegation scopes authorize every step in the plan."""
    # If already rejected by plan validation
    if not state.get("policy_approved", True):
        return {
            "current_node": "policy_evaluation",
            "policy_approved": False,
        }

    plan = state.get("execution_plan") or {}
    steps = plan.get("steps", [])

    # If 0 steps, policy check passes
    if not steps:
        return {
            "current_node": "policy_evaluation",
            "policy_approved": True,
            "policy_reason": "No operational tool steps requested; direct answer authorized.",
        }

    # Extract trusted runtime context
    configurable = config.get("configurable") or {}
    context: WorkflowContext = configurable.get("context")

    if not context:
        logger.error("[WorkflowNode:policy_evaluation] Missing WorkflowContext in configuration!")
        return {
            "current_node": "policy_evaluation",
            "policy_approved": False,
            "policy_reason": "Internal error: Missing runtime security context",
            "error_code": "WORKFLOW_POLICY_BLOCKED",
            "workflow_status": "blocked",
        }

    # Check each step against permitted scopes
    for step in steps:
        tool_name = step.get("tool_name", "").strip().lower()
        step_id = step.get("step_id", "unknown")
        req_scopes = TOOL_SCOPE_REQUIREMENTS.get(tool_name, ["tools:read"])

        # Check if user has at least one of the required scopes
        has_authorized_scope = any(context.has_scope(s) for s in req_scopes)
        if not has_authorized_scope:
            reason = (
                f"User '{context.authenticated_user_id}' (role '{context.organization_role}') lacks "
                f"required scope for tool '{tool_name}' in step '{step_id}'. Required: {req_scopes}"
            )
            logger.warning(f"[WorkflowNode:policy_evaluation] Policy blocked: {reason}")
            return {
                "current_node": "policy_evaluation",
                "policy_approved": False,
                "policy_reason": reason,
                "error_code": "WORKFLOW_POLICY_BLOCKED",
                "workflow_status": "blocked",
            }

    logger.info(
        f"[WorkflowNode:policy_evaluation] All {len(steps)} steps authorized for user '{context.authenticated_user_id}'"
    )
    return {
        "current_node": "policy_evaluation",
        "policy_approved": True,
        "policy_reason": f"All {len(steps)} planned operational actions authorized by delegation policy.",
    }
