"""Node for classifying incoming user request into authorized intent categories."""

import logging
from pathlib import Path
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.schemas import WorkflowIntentClassification, WorkflowIntent
from app.llm.provider_factory import get_llm_provider
from app.agents.exceptions import WorkflowClassificationFailedError

logger = logging.getLogger(__name__)

# Cache system prompt
_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "intent_classifier_v1.txt"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8") if _PROMPT_PATH.exists() else ""


async def classify_intent_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Invokes LLM provider to produce structured intent classification."""
    query = state.get("normalized_query") or state.get("original_query", "")

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": f"Classify the following support request:\n\n{query}"},
    ]

    try:
        provider = get_llm_provider()
        classification, _ = await provider.generate_structured(
            messages=messages,
            response_schema=WorkflowIntentClassification,
            temperature=0.0,
        )

        logger.info(
            f"[WorkflowNode:classify_intent] Classified intent='{classification.intent.value}' for run '{state.get('run_id')}'"
        )

        return {
            "current_node": "classify_intent",
            "intent": classification.intent.value,
            "classification": classification.model_dump(),
        }

    except Exception as e:
        logger.error(f"[WorkflowNode:classify_intent] Classification failed: {e}", exc_info=True)
        # Safe fallback: treat as general_question if classification fails
        fallback = WorkflowIntentClassification(
            intent=WorkflowIntent.GENERAL_QUESTION,
            summary=query[:100] if len(query.strip()) >= 3 else f"{query.strip()} inquiry" if query.strip() else "User query",
            urgency="medium",
            confidence_label="low",
            reasoning_summary=f"Fallback due to classification error: {str(e)}",
        )
        return {
            "current_node": "classify_intent",
            "intent": fallback.intent.value,
            "classification": fallback.model_dump(),
        }
