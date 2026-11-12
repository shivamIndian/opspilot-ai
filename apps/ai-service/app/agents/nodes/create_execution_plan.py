"""Node for creating an ordered, bounded multi-step execution plan."""

import logging
from typing import Dict, Any, List
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.schemas import (
    MultiStepExecutionPlan,
    PlanStep,
    WorkflowIntent,
)
from app.agents.services.planning_service import planning_service
from app.agents.constants import MAX_PLAN_STEPS

logger = logging.getLogger(__name__)


def _build_deterministic_fallback_plan(intent: str, query: str) -> MultiStepExecutionPlan:
    """Builds a safe, deterministic multi-step fallback plan when LLM is offline or fails."""
    normalized_intent = intent.lower()

    if "ticket_creation" in normalized_intent or "create_ticket" in normalized_intent:
        # Complex composite intent: first summarize history to check for duplicates, then propose ticket
        steps = [
            PlanStep(
                step_id="step_1",
                tool_name="summarize_support_history",
                action_type="read",
                arguments={"limit": 5},
                depends_on=[],
                expected_output="Recent organization tickets to check for duplicate issues",
            ),
            PlanStep(
                step_id="step_2",
                tool_name="create_support_ticket",
                action_type="mutation_proposal",
                arguments={
                    "title": query[:80] if len(query) >= 3 else "Support Request",
                    "subject": query[:80] if len(query) >= 3 else "Support Request",
                    "description": query if len(query) >= 5 else "Support Request description",
                    "category": "technical",
                    "priority": "medium",
                },
                depends_on=["step_1"],
                condition="Only when no matching existing ticket is found",
                expected_output="Proposed support ticket awaiting human approval",
            ),
        ]
        return MultiStepExecutionPlan(
            objective=f"Verify existing support history and propose support ticket for: {query[:80]}",
            steps=steps,
        )

    elif "knowledge" in normalized_intent:
        steps = [
            PlanStep(
                step_id="step_1",
                tool_name="search_knowledge_base",
                action_type="read",
                arguments={"query": query, "top_k": 5, "retrieval_mode": "hybrid"},
                depends_on=[],
                expected_output="Authoritative documentation and policy snippets",
            )
        ]
        return MultiStepExecutionPlan(
            objective=f"Search company documentation regarding: {query[:80]}",
            steps=steps,
        )

    elif "history" in normalized_intent:
        steps = [
            PlanStep(
                step_id="step_1",
                tool_name="summarize_support_history",
                action_type="read",
                arguments={"limit": 5},
                depends_on=[],
                expected_output="Recent support activity records",
            )
        ]
        return MultiStepExecutionPlan(
            objective="Retrieve recent organizational support history",
            steps=steps,
        )

    elif "user" in normalized_intent:
        steps = [
            PlanStep(
                step_id="step_1",
                tool_name="search_user_information",
                action_type="read",
                arguments={"name": query},
                depends_on=[],
                expected_output="Organization member details",
            )
        ]
        return MultiStepExecutionPlan(
            objective="Lookup user contact and membership details",
            steps=steps,
        )

    elif "lookup" in normalized_intent:
        steps = [
            PlanStep(
                step_id="step_1",
                tool_name="get_ticket_details",
                action_type="read",
                arguments={"ticket_id": "22222222-2222-4222-8222-222222222222", "ticket_number": 1001},
                depends_on=[],
                expected_output="Support ticket status and details",
            )
        ]
        return MultiStepExecutionPlan(
            objective="Retrieve support ticket details",
            steps=steps,
        )

    # General question, clarification, or unsupported request: 0 steps, direct synthesis
    return MultiStepExecutionPlan(
        objective="Address direct conversational inquiry without external tool execution",
        steps=[],
    )


async def create_execution_plan_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Generates an ordered multi-step execution plan using LLM planning service."""
    query = state.get("normalized_query") or state.get("original_query", "")
    intent_str = state.get("intent", WorkflowIntent.GENERAL_QUESTION.value)

    # If classified as direct general question or unsupported, skip tool steps
    if intent_str in (
        WorkflowIntent.GENERAL_QUESTION.value,
        WorkflowIntent.UNSUPPORTED_REQUEST.value,
        WorkflowIntent.NEEDS_CLARIFICATION.value,
    ):
        logger.info(f"[WorkflowNode:create_execution_plan] Intent '{intent_str}' requires 0 tools. Routing to direct synthesis.")
        empty_plan = MultiStepExecutionPlan(
            objective="Address inquiry directly without tool execution",
            steps=[],
        )
        return {
            "current_node": "create_execution_plan",
            "objective": empty_plan.objective,
            "execution_plan": empty_plan.model_dump(),
            "total_steps": 0,
            "current_step_index": 0,
        }

    try:
        plan = await planning_service.create_initial_plan(query=query, intent=intent_str)
        logger.info(
            f"[WorkflowNode:create_execution_plan] Created multi-step plan with {len(plan.steps)} steps for run '{state.get('run_id')}'"
        )
    except Exception as e:
        logger.warning(
            f"[WorkflowNode:create_execution_plan] Planner error: {e}. Utilizing deterministic fallback plan."
        )
        plan = _build_deterministic_fallback_plan(intent=intent_str, query=query)

    return {
        "current_node": "create_execution_plan",
        "objective": plan.objective,
        "execution_plan": plan.model_dump(),
        "total_steps": len(plan.steps),
        "current_step_index": 0,
    }
