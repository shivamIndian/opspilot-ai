"""Semantic retrieval service for agent memories."""

import uuid
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.embeddings.provider_factory import get_embedding_provider
from app.memory.repositories.memory_embedding_repository import MemoryEmbeddingRepository
from app.memory.repositories.memory_settings_repository import MemorySettingsRepository
from app.memory.schemas import (
    MemoryResponse,
    MemorySearchResultItem,
    MemoryType,
)
from app.memory.exceptions import MemoryConsentRequiredError

logger = logging.getLogger("opspilot.memory.retrieval")


class MemoryRetrievalService:
    """Retrieves relevant user memories using semantic vector search with consent checks."""

    @staticmethod
    async def retrieve_relevant_memories(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        query: str,
        memory_type: Optional[MemoryType] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.6,
        require_consent: bool = False,
    ) -> List[MemorySearchResultItem]:
        """Search user memories semantically."""
        # 1. Consent verification
        settings = await MemorySettingsRepository.get_or_create(session, organization_id, user_id)
        if not settings.memory_enabled:
            if require_consent:
                raise MemoryConsentRequiredError("Agent memory is disabled for this user.")
            logger.debug("Memory retrieval skipped: memory_enabled is False for user %s", user_id)
            return []

        clean_query = query.strip()
        if not clean_query:
            return []

        # 2. Generate embedding for query
        embedding_provider = get_embedding_provider()
        try:
            query_vector = await embedding_provider.embed_query(clean_query)
        except Exception as e:
            logger.error("Failed to generate embedding for memory search: %s", e)
            return []

        # 3. Vector similarity search
        type_filter = memory_type.value if memory_type else None
        matches = await MemoryEmbeddingRepository.search_similar_memories(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            query_embedding=query_vector,
            embedding_space=embedding_provider.embedding_space,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            memory_type=type_filter,
        )

        results: List[MemorySearchResultItem] = []
        for mem, score in matches:
            mem_resp = MemoryResponse.model_validate(mem)
            citation = f"[Memory: {mem.title} ({mem.memory_type})] {mem.content}"
            results.append(
                MemorySearchResultItem(
                    memory=mem_resp,
                    score=round(score, 4),
                    citation_text=citation,
                )
            )

        return results
