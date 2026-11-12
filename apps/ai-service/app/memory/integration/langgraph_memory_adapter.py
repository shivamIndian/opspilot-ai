"""LangGraph workflow adapter for persistent user memory and context injection."""

import uuid
import logging
from typing import Dict, Any, List, Optional
from langchain_core.runnables import RunnableConfig
from app.database.session import AsyncSessionLocal
from app.memory.services.memory_retrieval_service import MemoryRetrievalService
from app.memory.context import format_memories_as_context
from app.memory.extraction.extractor import ConversationMemoryExtractor
from app.memory.repositories.memory_settings_repository import MemorySettingsRepository

logger = logging.getLogger("opspilot.memory.adapter")


class LangGraphMemoryAdapter:
    """Bridges LangGraph workflows with long-term user memory and candidate extraction."""

    @staticmethod
    async def retrieve_and_format_memory(
        organization_id_str: str,
        user_id_str: Optional[str],
        query: str,
    ) -> Dict[str, Any]:
        """Pre-workflow memory retrieval: fetches relevant user memories and builds advisory context."""
        if not user_id_str or not organization_id_str or not query:
            return {
                "user_memories": [],
                "user_memory_context": None,
            }

        try:
            org_id = uuid.UUID(organization_id_str)
            user_id = uuid.UUID(user_id_str)
        except (ValueError, TypeError):
            return {
                "user_memories": [],
                "user_memory_context": None,
            }

        try:
            async with AsyncSessionLocal() as session:
                memories = await MemoryRetrievalService.retrieve_relevant_memories(
                    session=session,
                    organization_id=org_id,
                    user_id=user_id,
                    query=query,
                    top_k=3,
                    similarity_threshold=0.55,
                    require_consent=False,
                )

                if not memories:
                    return {
                        "user_memories": [],
                        "user_memory_context": None,
                    }

                formatted_block = format_memories_as_context(memories)
                memory_dicts = [m.memory.model_dump(mode="json") for m in memories]

                logger.info(
                    "Retrieved %d active memory item(s) for user %s in org %s",
                    len(memories),
                    user_id,
                    org_id,
                )

                return {
                    "user_memories": memory_dicts,
                    "user_memory_context": formatted_block,
                }
        except Exception as e:
            logger.warning("Failed to retrieve user memory context for workflow: %s", e)
            return {
                "user_memories": [],
                "user_memory_context": None,
            }

    @staticmethod
    async def extract_candidate_proposals(
        organization_id_str: str,
        user_id_str: Optional[str],
        conversation_id: str,
        messages: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Post-workflow candidate memory extraction if user consent allows it."""
        if not user_id_str or not organization_id_str or not messages:
            return []

        try:
            org_id = uuid.UUID(organization_id_str)
            user_id = uuid.UUID(user_id_str)
        except (ValueError, TypeError):
            return []

        try:
            async with AsyncSessionLocal() as session:
                settings = await MemorySettingsRepository.get_or_create(session, org_id, user_id)
                if not settings.memory_enabled or not settings.memory_extraction_enabled:
                    return []

            extractor = ConversationMemoryExtractor()
            proposals = await extractor.extract_candidates(messages)
            return [p.model_dump(mode="json") for p in proposals]
        except Exception as e:
            logger.warning("Post-workflow memory extraction encountered an error: %s", e)
            return []
