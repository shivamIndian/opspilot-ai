"""Conditional edge router for OpsPilot LangGraph workflow."""

import logging
from typing import Literal
from app.agents.state import OpsPilotWorkflowState

logger = logging.getLogger(__name__)

RouteDestination = Literal[
    "knowledge_retrieval",
    "execute_readonly_tool",
    "propose_mutation",
    "generate_response",
]


def route_after_policy_check(state: OpsPilotWorkflowState) -> RouteDestination:
    """Evaluates validated state and routes to appropriate execution node or response generation."""
    route_target = state.get("route_target", "general_question")

    logger.debug(f"[WorkflowRouter] Routing after policy_check: target='{route_target}'")

    if route_target == "knowledge_retrieval":
        return "knowledge_retrieval"
    elif route_target == "execute_readonly_tool":
        return "execute_readonly_tool"
    elif route_target == "propose_mutation":
        return "propose_mutation"
    else:
        # Policy blocked, needs clarification, unsupported, or general question all go directly to response generation
        return "generate_response"
