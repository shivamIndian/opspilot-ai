"""Node for validating input query, identifiers, and establishing baseline workflow state."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.exceptions import WorkflowInvalidInputError
from app.tools.sanitizers import sanitize_text

logger = logging.getLogger(__name__)


async def validate_input_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Validates query format, size bounds, and required identifiers."""
    query = state.get("original_query", "")
    if not isinstance(query, str) or not query.strip():
        raise WorkflowInvalidInputError("User query is missing or empty")

    cleaned = sanitize_text(query).strip()
    if len(cleaned) < 1:
        raise WorkflowInvalidInputError("User query cannot be empty after sanitization")
    if len(cleaned) > 5000:
        raise WorkflowInvalidInputError("User query exceeds maximum allowed length of 5000 characters")

    req_id = state.get("request_id")
    org_id = state.get("organization_id")
    if not req_id or not org_id:
        raise WorkflowInvalidInputError("Missing required execution identifiers (request_id or organization_id)")

    logger.info(f"[WorkflowNode:validate_input] Validated input for run '{state.get('run_id')}' (org='{org_id}')")

    return {
        "current_node": "validate_input",
        "normalized_query": cleaned,
        "workflow_status": "running",
        "insufficient_evidence": False,
        "requires_approval": False,
        "selected_tool": None,
        "tool_arguments": {},
        "action_proposal": None,
        "proposal_id": None,
        "current_step_index": 0,
        "total_steps": 0,
        "completed_steps_count": 0,
        "completed_steps": [],
        "failed_steps": [],
        "tool_call_count": 0,
        "replan_count": 0,
        "tool_results": {},
        "pending_proposal_ids": [],
        "completed_proposal_ids": [],
        "retrieved_sources": [],
        "citation_data": [],
    }
