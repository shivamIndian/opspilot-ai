"""Node for evaluating security policies, permission scopes, and routing decisions."""

import logging
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.agents.schemas import WorkflowIntent
from app.tools.registry import get_tool_registry
from app.tools.schemas import ToolExecutionMode

logger = logging.getLogger(__name__)


async def policy_check_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Validates runtime context, authorized scopes, and determines conditional routing target."""
    context: Optional[WorkflowContext] = config.get("configurable", {}).get("context")
    selected_tool = state.get("selected_tool")
    intent = state.get("intent", WorkflowIntent.GENERAL_QUESTION.value)

    # If no tool is selected (e.g. general question, needs clarification, unsupported)
    if not selected_tool:
        if intent == WorkflowIntent.NEEDS_CLARIFICATION.value:
            route_target = "needs_clarification"
        elif intent == WorkflowIntent.UNSUPPORTED_REQUEST.value:
            route_target = "unsupported_request"
        else:
            route_target = "general_question"

        return {
            "current_node": "policy_check",
            "route_target": route_target,
        }

    # Verify tool exists in registry
    registry = get_tool_registry()
    if not registry.has(selected_tool):
        logger.warning(f"[WorkflowNode:policy_check] Tool '{selected_tool}' not in registry. Routing to general.")
        return {
            "current_node": "policy_check",
            "route_target": "general_question",
            "selected_tool": None,
        }

    tool = registry.get(selected_tool)

    # 1. Availability check
    if not tool.enabled:
        logger.warning(f"[WorkflowNode:policy_check] Tool '{selected_tool}' is disabled by administrative policy")
        return {
            "current_node": "policy_check",
            "route_target": "policy_blocked",
            "workflow_status": "blocked",
            "error_code": "WORKFLOW_POLICY_BLOCKED",
            "execution_error": {
                "code": "WORKFLOW_TOOL_UNAVAILABLE",
                "message": f"Tool '{selected_tool}' is currently disabled",
            },
        }

    # 2. Permission scopes check against trusted context
    if context and tool.required_permissions:
        missing_scopes = [s for s in tool.required_permissions if not context.has_scope(s)]
        if missing_scopes:
            logger.warning(
                f"[WorkflowNode:policy_check] Access blocked for tool '{selected_tool}': Missing scopes {missing_scopes}"
            )
            return {
                "current_node": "policy_check",
                "route_target": "policy_blocked",
                "workflow_status": "blocked",
                "error_code": "WORKFLOW_POLICY_BLOCKED",
                "execution_error": {
                    "code": "WORKFLOW_POLICY_BLOCKED",
                    "message": f"Insufficient permissions: required scopes {missing_scopes}",
                    "missing_scopes": missing_scopes,
                },
            }

    # 3. Select appropriate execution node route
    if selected_tool == "search_knowledge_base":
        route_target = "knowledge_retrieval"
    elif tool.execution_mode == ToolExecutionMode.PROPOSAL_ONLY:
        route_target = "propose_mutation"
    else:
        route_target = "execute_readonly_tool"

    logger.info(f"[WorkflowNode:policy_check] Policy approved for '{selected_tool}'. Route -> '{route_target}'")

    return {
        "current_node": "policy_check",
        "route_target": route_target,
    }
