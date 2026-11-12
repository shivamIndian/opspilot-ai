"""Node for executing the next planned step in the multi-step operational sequence."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.agents.constants import MAX_TOOL_CALLS_PER_RUN
from app.tools.executor import get_tool_execution_engine
from app.tools.schemas import ExecuteToolRequest
from app.tools.definitions.ticket_tools import (
    CreateSupportTicketTool,
    UpdateSupportTicketTool,
)

logger = logging.getLogger(__name__)


def _resolve_step_arguments(
    raw_arguments: Dict[str, Any],
    tool_results: Dict[str, Any],
    query: str,
) -> Dict[str, Any]:
    """Resolves template references or contextual parameters from prior step outputs."""
    resolved = dict(raw_arguments)

    for k, v in resolved.items():
        if isinstance(v, str):
            if "{query}" in v:
                resolved[k] = v.replace("{query}", query)
            elif "{previous_output}" in v and tool_results:
                # Find most recent previous output
                last_res = list(tool_results.values())[-1]
                resolved[k] = v.replace("{previous_output}", str(last_res))

    return resolved


async def execute_next_step_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Executes the tool designated by current_step_index under bounded limits."""
    plan = state.get("execution_plan") or {}
    steps = plan.get("steps", [])
    current_idx = state.get("current_step_index", 0)
    tool_call_count = state.get("tool_call_count", 0)
    query = state.get("normalized_query") or state.get("original_query", "")
    tool_results = state.get("tool_results") or {}

    # Safety check: Bounded tool execution limit
    if tool_call_count >= MAX_TOOL_CALLS_PER_RUN:
        logger.warning(
            f"[WorkflowNode:execute_next_step] Exceeded MAX_TOOL_CALLS_PER_RUN ({MAX_TOOL_CALLS_PER_RUN}). Halting execution."
        )
        return {
            "current_node": "execute_next_step",
            "route_target": "finalize",
        }

    # Safety check: Valid step index
    if current_idx >= len(steps):
        logger.info("[WorkflowNode:execute_next_step] Current step index exceeds plan length. Finalizing.")
        return {
            "current_node": "execute_next_step",
            "route_target": "finalize",
        }

    step = steps[current_idx]
    tool_name = step.get("tool_name", "").strip().lower()
    action_type = step.get("action_type", "read")
    step_id = step.get("step_id", f"step_{current_idx + 1}")

    import uuid

    # Extract trusted runtime context
    configurable = config.get("configurable") or {}
    context: WorkflowContext = configurable.get("context")

    tool_context = context.to_tool_execution_context(execution_id=str(uuid.uuid4()))

    resolved_args = _resolve_step_arguments(step.get("arguments") or {}, tool_results, query)

    logger.info(
        f"[WorkflowNode:execute_next_step] Executing step '{step_id}' ({current_idx + 1}/{len(steps)}): "
        f"tool='{tool_name}', action_type='{action_type}'"
    )

    engine = get_tool_execution_engine()
    action_proposal = None
    requires_approval = False
    proposal_id = None
    step_result: Dict[str, Any] = {}

    try:
        if action_type in ("mutation_proposal", "propose_mutation"):
            # Enforce proposal-only execution for mutations
            if tool_name == "create_support_ticket":
                tool_instance = CreateSupportTicketTool()
                input_model = (
                    tool_instance.input_schema.model_validate(resolved_args)
                    if isinstance(resolved_args, dict)
                    else resolved_args
                )
                output = await tool_instance.execute(input_model, tool_context)
                step_result = output.model_dump()
                action_proposal = step_result
                requires_approval = True
                proposal_id = step_result.get("proposal_id")

            elif tool_name == "update_support_ticket":
                tool_instance = UpdateSupportTicketTool()
                input_model = (
                    tool_instance.input_schema.model_validate(resolved_args)
                    if isinstance(resolved_args, dict)
                    else resolved_args
                )
                output = await tool_instance.execute(input_model, tool_context)
                step_result = output.model_dump()
                action_proposal = step_result
                requires_approval = True
                proposal_id = step_result.get("proposal_id")

            else:
                # Disallow arbitrary mutation tools
                raise ValueError(f"Unsupported mutation proposal tool: {tool_name}")

        else:
            # Read-only execution via execution engine
            req = ExecuteToolRequest(
                tool_name=tool_name,
                arguments=resolved_args,
                request_id=context.request_id,
                execution_id=tool_context.execution_id,
                authenticated_user_id=context.authenticated_user_id,
                organization_id=context.organization_id,
                delegated_authorization_token=context.delegated_authorization_token,
                permitted_scopes=context.permitted_scopes,
                platform_role=context.organization_role,
                correlation_id=context.correlation_id,
            )
            resp = await engine.execute(req)
            if resp.success:
                step_result = resp.data or {}
            else:
                step_result = {"error": resp.error or "Tool execution failed", "failed": True}

    except Exception as e:
        logger.error(f"[WorkflowNode:execute_next_step] Execution failed for step '{step_id}': {e}", exc_info=True)
        step_result = {
            "error": str(e),
            "step_id": step_id,
            "failed": True,
        }

    return {
        "current_node": "execute_next_step",
        "tool_call_count": tool_call_count + 1,
        "selected_tool": tool_name,
        "tool_arguments": resolved_args,
        "tool_result": step_result,
        "action_proposal": action_proposal,
        "requires_approval": requires_approval or state.get("requires_approval", False),
        "proposal_id": proposal_id or state.get("proposal_id"),
    }
