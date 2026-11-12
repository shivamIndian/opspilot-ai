"""Node for creating a single, bounded operational execution plan."""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.schemas import WorkflowExecutionPlan, WorkflowIntent
from app.agents.exceptions import WorkflowPlanInvalidError
from app.tools.registry import get_tool_registry
from app.tools.schemas import ToolExecutionMode
from app.llm.provider_factory import get_llm_provider

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "task_planner_v1.txt"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8") if _PROMPT_PATH.exists() else ""


async def create_plan_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Formulates and validates a single-step execution plan."""
    query = state.get("normalized_query") or state.get("original_query", "")
    intent_str = state.get("intent", WorkflowIntent.GENERAL_QUESTION.value)

    prompt_user = (
        f"Create an execution plan for intent '{intent_str}' and query:\n\n{query}"
    )

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": prompt_user},
    ]

    try:
        provider = get_llm_provider()
        plan, _ = await provider.generate_structured(
            messages=messages,
            response_schema=WorkflowExecutionPlan,
            temperature=0.0,
        )
    except Exception as e:
        logger.warning(f"[WorkflowNode:create_plan] Planner LLM invocation error: {e}. Falling back.")
        # Deterministic fallback plan based on classified intent
        plan = _build_deterministic_fallback_plan(intent_str, query)

    # 1. Validate tool name against centralized registry
    selected_tool = plan.selected_tool
    tool_args = plan.tool_arguments or {}
    requires_approval = False

    if selected_tool:
        registry = get_tool_registry()
        if not registry.has(selected_tool):
            logger.warning(
                f"[WorkflowNode:create_plan] Planner requested unknown tool '{selected_tool}'. Discarding tool."
            )
            selected_tool = None
            tool_args = {}
        else:
            tool_def = registry.get(selected_tool)
            # Enforce proposal-only policy regardless of LLM claim
            if tool_def.execution_mode == ToolExecutionMode.PROPOSAL_ONLY:
                requires_approval = True
                plan.action_type = "propose_mutation"

    logger.info(
        f"[WorkflowNode:create_plan] Plan created: intent='{intent_str}', tool='{selected_tool}', requires_approval={requires_approval}"
    )

    return {
        "current_node": "create_plan",
        "execution_plan": plan.model_dump(),
        "selected_tool": selected_tool,
        "tool_arguments": tool_args,
        "requires_approval": requires_approval,
    }


def _build_deterministic_fallback_plan(intent_str: str, query: str) -> WorkflowExecutionPlan:
    """Provides safe deterministic plan when planner LLM is unavailable."""
    if intent_str == WorkflowIntent.KNOWLEDGE_QUESTION.value:
        return WorkflowExecutionPlan(
            intent=WorkflowIntent.KNOWLEDGE_QUESTION,
            objective="Search organization knowledge base",
            selected_tool="search_knowledge_base",
            tool_arguments={"query": query[:200], "top_k": 5, "retrieval_mode": "hybrid"},
            action_type="read",
            requires_approval=False,
        )
    if intent_str == WorkflowIntent.TICKET_CREATION_REQUEST.value:
        return WorkflowExecutionPlan(
            intent=WorkflowIntent.TICKET_CREATION_REQUEST,
            objective="Propose ticket creation",
            selected_tool="create_support_ticket",
            tool_arguments={
                "title": query[:100],
                "description": query,
                "category": "technical",
                "priority": "medium",
            },
            action_type="propose_mutation",
            requires_approval=True,
        )
    if intent_str == WorkflowIntent.TICKET_UPDATE_REQUEST.value:
        return WorkflowExecutionPlan(
            intent=WorkflowIntent.TICKET_UPDATE_REQUEST,
            objective="Propose ticket update",
            selected_tool="update_support_ticket",
            tool_arguments={"ticket_id": "", "changes": {}},
            action_type="propose_mutation",
            requires_approval=True,
        )
    if intent_str == WorkflowIntent.TICKET_LOOKUP.value:
        return WorkflowExecutionPlan(
            intent=WorkflowIntent.TICKET_LOOKUP,
            objective="Retrieve ticket details",
            selected_tool="get_ticket_details",
            tool_arguments={"ticket_id": ""},
            action_type="read",
            requires_approval=False,
        )
    if intent_str == WorkflowIntent.USER_LOOKUP.value:
        return WorkflowExecutionPlan(
            intent=WorkflowIntent.USER_LOOKUP,
            objective="Search users",
            selected_tool="search_user_information",
            tool_arguments={"query": query[:50], "limit": 10},
            action_type="read",
            requires_approval=False,
        )
    if intent_str == WorkflowIntent.SUPPORT_HISTORY_QUERY.value:
        return WorkflowExecutionPlan(
            intent=WorkflowIntent.SUPPORT_HISTORY_QUERY,
            objective="Summarize support history",
            selected_tool="summarize_support_history",
            tool_arguments={"limit": 10},
            action_type="read",
            requires_approval=False,
        )

    return WorkflowExecutionPlan(
        intent=WorkflowIntent.GENERAL_QUESTION,
        objective="Address request directly",
        selected_tool=None,
        tool_arguments={},
        action_type="none",
        requires_approval=False,
    )
