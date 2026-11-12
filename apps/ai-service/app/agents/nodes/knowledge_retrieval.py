"""Node for executing Module 09 RAG knowledge retrieval."""

import logging
import uuid
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.tools.executor import get_tool_execution_engine
from app.tools.schemas import ExecuteToolRequest

logger = logging.getLogger(__name__)


async def knowledge_retrieval_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Executes authorized knowledge base search using Module 11 execution framework."""
    context: Optional[WorkflowContext] = config.get("configurable", {}).get("context")
    tool_args = state.get("tool_arguments") or {}

    query = tool_args.get("query") or state.get("normalized_query") or state.get("original_query", "")
    top_k = tool_args.get("top_k", 5)
    retrieval_mode = tool_args.get("retrieval_mode", "hybrid")

    execution_id = f"exec-{uuid.uuid4().hex[:12]}"
    engine = get_tool_execution_engine()

    req = ExecuteToolRequest(
        tool_name="search_knowledge_base",
        arguments={
            "query": query,
            "top_k": top_k,
            "retrieval_mode": retrieval_mode,
        },
        request_id=state.get("request_id", str(uuid.uuid4())),
        execution_id=execution_id,
        authenticated_user_id=context.authenticated_user_id if context else "",
        organization_id=context.organization_id if context else state.get("organization_id", ""),
        delegated_authorization_token=context.delegated_authorization_token if context else "",
        permitted_scopes=context.permitted_scopes if context else ["tools:knowledge:read"],
        platform_role=context.organization_role if context else "member",
        correlation_id=context.correlation_id if context else None,
    )

    resp = await engine.execute(req)

    passages = []
    insufficient = True

    if resp.success and resp.data:
        passages = resp.data.get("passages", [])
        if len(passages) > 0:
            insufficient = False

    logger.info(
        f"[WorkflowNode:knowledge_retrieval] Retrieved {len(passages)} passages for run '{state.get('run_id')}'. Insufficient={insufficient}"
    )

    return {
        "current_node": "knowledge_retrieval",
        "retrieved_sources": passages,
        "citation_data": passages,
        "tool_result": resp.data if resp.success else None,
        "insufficient_evidence": insufficient,
        "execution_error": resp.error if not resp.success else None,
    }
