"""Repository for AgentMemoryEmbedding entity and vector similarity retrieval."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, and_, or_, delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.memory.models import AgentMemory, AgentMemoryEmbedding
from app.memory.schemas import MemoryStatus


class MemoryEmbeddingRepository:
    """Handles vector embedding storage and pgvector similarity retrieval."""

    @staticmethod
    async def upsert_embedding(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
        provider: str,
        model: str,
        dimensions: int,
        embedding_space: str,
        embedding: List[float],
    ) -> AgentMemoryEmbedding:
        """Store or replace memory vector embedding."""
        # Check existing for this space
        query = select(AgentMemoryEmbedding).where(
            and_(
                AgentMemoryEmbedding.memory_id == memory_id,
                AgentMemoryEmbedding.embedding_space == embedding_space,
            )
        )
        existing = (await session.execute(query)).scalar_one_or_none()

        if existing:
            existing.embedding = embedding
            existing.provider = provider
            existing.model = model
            existing.dimensions = dimensions
            await session.flush()
            return existing

        new_embedding = AgentMemoryEmbedding(
            organization_id=organization_id,
            user_id=user_id,
            memory_id=memory_id,
            provider=provider,
            model=model,
            dimensions=dimensions,
            embedding_space=embedding_space,
            embedding=embedding,
        )
        session.add(new_embedding)
        await session.flush()
        return new_embedding

    @staticmethod
    async def delete_by_memory_id(session: AsyncSession, memory_id: uuid.UUID) -> int:
        """Delete all embeddings associated with a memory ID."""
        stmt = delete(AgentMemoryEmbedding).where(AgentMemoryEmbedding.memory_id == memory_id)
        result = await session.execute(stmt)
        return result.rowcount

    @staticmethod
    async def search_similar_memories(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        query_embedding: List[float],
        embedding_space: str,
        top_k: int = 5,
        similarity_threshold: float = 0.6,
        memory_type: Optional[str] = None,
    ) -> List[Tuple[AgentMemory, float]]:
        """Search active memories using vector cosine similarity.
        
        Returns:
            List of (AgentMemory, cosine_similarity_score) tuples ordered descending.
        """
        # Cosine distance: 1 - cosine_similarity.
        # pgvector cosine distance operator: <=>
        # cosine_similarity = 1 - (embedding <=> query_embedding)
        similarity_expr = (1 - AgentMemoryEmbedding.embedding.cosine_distance(query_embedding)).label("score")

        conditions = [
            AgentMemoryEmbedding.organization_id == organization_id,
            AgentMemoryEmbedding.user_id == user_id,
            AgentMemoryEmbedding.embedding_space == embedding_space,
            AgentMemory.status == MemoryStatus.ACTIVE.value,
            AgentMemory.deleted_at.is_(None),
            or_(
                AgentMemory.expires_at.is_(None),
                AgentMemory.expires_at > text("CURRENT_TIMESTAMP"),
            ),
        ]

        if memory_type:
            conditions.append(AgentMemory.memory_type == memory_type)

        query = (
            select(AgentMemory, similarity_expr)
            .join(AgentMemoryEmbedding, AgentMemory.id == AgentMemoryEmbedding.memory_id)
            .where(and_(*conditions))
            .order_by(similarity_expr.desc())
            .limit(top_k)
        )

        rows = (await session.execute(query)).all()
        results: List[Tuple[AgentMemory, float]] = []

        for memory, score in rows:
            float_score = float(score) if score is not None else 0.0
            if float_score >= similarity_threshold:
                results.append((memory, float_score))

        return results
