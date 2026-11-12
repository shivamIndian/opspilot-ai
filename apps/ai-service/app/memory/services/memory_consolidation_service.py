"""Consolidation and conflict resolution service for agent memories."""

import uuid
import logging
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.memory.repositories.memory_repository import MemoryRepository, calculate_content_hash
from app.memory.repositories.memory_embedding_repository import MemoryEmbeddingRepository
from app.memory.models import AgentMemory
from app.memory.exceptions import MemoryDuplicateError

logger = logging.getLogger("opspilot.memory.consolidation")


class MemoryConsolidationService:
    """Detects exact duplicates and semantic overlap before memory persistence."""

    SIMILARITY_DUPLICATE_THRESHOLD = 0.92

    @staticmethod
    async def check_exact_duplicate(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        content: str,
    ) -> Tuple[bool, Optional[AgentMemory]]:
        """Check if an active memory with exact content hash exists for the user."""
        c_hash = calculate_content_hash(content)
        existing = await MemoryRepository.find_by_content_hash(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            content_hash=c_hash,
        )
        return (existing is not None), existing

    @staticmethod
    async def check_semantic_duplicate(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        query_embedding: list[float],
        embedding_space: str,
    ) -> Tuple[bool, Optional[AgentMemory], float]:
        """Check if an active memory with extremely high semantic similarity exists (>0.92)."""
        matches = await MemoryEmbeddingRepository.search_similar_memories(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            query_embedding=query_embedding,
            embedding_space=embedding_space,
            top_k=1,
            similarity_threshold=MemoryConsolidationService.SIMILARITY_DUPLICATE_THRESHOLD,
        )
        if matches:
            top_mem, score = matches[0]
            return True, top_mem, score
        return False, None, 0.0
