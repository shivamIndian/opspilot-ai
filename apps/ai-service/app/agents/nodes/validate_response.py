"""Node for validating generated response schema, citations, and payload size bounds."""

import logging
import re
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.tools.sanitizers import sanitize_text

logger = logging.getLogger(__name__)


async def validate_response_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Validates response size, strips control characters, and audits citations."""
    raw_answer = state.get("generated_answer") or ""

    # Sanitize and bound response
    cleaned = sanitize_text(raw_answer)

    # Validate citations if present
    sources = state.get("retrieved_sources") or []
    valid_source_ids = {f"S{i}" for i in range(1, len(sources) + 1)}

    # Check for hallucinated citation references [S99]
    found_ids = set(re.findall(r"\[(S\d+)\]", cleaned))
    hallucinated_ids = found_ids - valid_source_ids

    if hallucinated_ids:
        logger.warning(
            f"[WorkflowNode:validate_response] Stripping hallucinated citations {hallucinated_ids} from answer"
        )
        for h_id in hallucinated_ids:
            cleaned = re.sub(rf"\[{h_id}\]", "", cleaned)

    return {
        "current_node": "validate_response",
        "generated_answer": cleaned.strip(),
        "final_response": cleaned.strip(),
    }
