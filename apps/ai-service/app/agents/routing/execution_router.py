"""Routing logic for multi-step agent execution loop."""

import logging
from typing import Literal
from app.agents.state import OpsPilotWorkflowState

logger = logging.getLogger(__name__)

PolicyRouteDestination = Literal[
    "execute_next_step",
    "generate_final_response",
]

ProgressRouteDestination = Literal[
    "execute_next_step",
    "revise_plan",
    "generate_final_response",
]

ValidationRouteDestination = Literal[
    "await_human_approval",
    "finalize_execution",
]


def route_after_policy(state: OpsPilotWorkflowState) -> PolicyRouteDestination:
    """Routes after policy evaluation: proceeds to execution loop or exits directly."""
    policy_approved = state.get("policy_approved", True)
    total_steps = state.get("total_steps", 0)

    if not policy_approved:
        logger.info("[ExecutionRouter] Policy not approved. Routing directly to response generation.")
        return "generate_final_response"

    if total_steps == 0:
        logger.info("[ExecutionRouter] Zero execution steps planned. Routing directly to response generation.")
        return "generate_final_response"

    logger.debug(f"[ExecutionRouter] Policy approved with {total_steps} planned steps. Advancing to execute_next_step.")
    return "execute_next_step"


def route_step_progress(state: OpsPilotWorkflowState) -> ProgressRouteDestination:
    """Routes based on intermediate evaluation outcome: next step, replan, or finalize."""
    route_target = state.get("route_target", "next_step")

    if route_target == "replan":
        logger.info("[ExecutionRouter] Replan decision triggered. Routing to revise_plan.")
        return "revise_plan"
    elif route_target == "finalize":
        logger.info("[ExecutionRouter] Finalize decision triggered. Routing to generate_final_response.")
        return "generate_final_response"
    else:
        logger.debug("[ExecutionRouter] Next step decision triggered. Routing to execute_next_step.")
        return "execute_next_step"


def route_after_validation(state: OpsPilotWorkflowState) -> ValidationRouteDestination:
    """Routes after response validation: halts at await_human_approval if proposal requires human review."""
    requires_approval = state.get("requires_approval", False)
    has_resumed = state.get("human_approval_decision") is not None

    if requires_approval and not has_resumed:
        logger.info("[ExecutionRouter] Action proposal detected. Routing to await_human_approval.")
        return "await_human_approval"

    return "finalize_execution"
