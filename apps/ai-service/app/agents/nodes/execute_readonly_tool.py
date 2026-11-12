"""Node for executing authorized read-only business tools."""

import logging
import uuid
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.tools.executor import get_tool_execution_engine
from app.tools.schemas import ExecuteToolRequest

logger = logging.getLogger(__name__)


async def execute_readonly_tool_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Executes an authorized read-only tool within the secure Module 11 runtime."""
    context: Optional[WorkflowContext] = config.get("configurable", {}).get("context")
    tool_name = state.get("selected_tool")
    tool_args = state.get("tool_arguments") or {}

    if not tool_name:
        return {
            "current_node": "execute_readonly_tool",
            "tool_result": None,
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
        permitted_scopes=context.permitted_scopes if context else [],
        platform_role=context.organization_role if context else "member",
        correlation_id=context.correlation_id if context else None,
    )

    resp = await engine.execute(req)

    logger.info(
        f"[WorkflowNode:execute_readonly_tool] Tool '{tool_name}' executed: success={resp.success} (run='{state.get('run_id')}')"
    )

    return {
        "current_node": "execute_readonly_tool",
        "tool_result": resp.data if resp.success else None,
        "execution_error": resp.error if not resp.success else None,
    }
