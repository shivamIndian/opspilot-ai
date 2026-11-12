"""Repository for querying document chunks and persisting vector embeddings."""

import uuid
from typing import List, Dict, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.document_processing.models.processing_run import DocumentProcessingRun
from app.document_processing.models.document_chunk import DocumentChunk
from app.embeddings.models.document_embedding import DocumentChunkEmbedding


class EmbeddingRepository:
    """Handles database persistence and retrieval for document chunk embeddings."""

    @staticmethod
    async def get_processing_run(
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_generation: int,
    ) -> Optional[DocumentProcessingRun]:
        """Retrieves a processing run record verifying organization and generation."""
        query = select(DocumentProcessingRun).where(
            and_(
                DocumentProcessingRun.organization_id == organization_id,
                DocumentProcessingRun.document_id == document_id,
                DocumentProcessingRun.processing_generation == processing_generation,
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_chunks_for_generation(
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_run_id: uuid.UUID,
    ) -> List[DocumentChunk]:
        """Fetches all chunks for a processing run, strictly scoped by organization."""
        query = (
            select(DocumentChunk)
            .where(
                and_(
                    DocumentChunk.organization_id == organization_id,
                    DocumentChunk.document_id == document_id,
                    DocumentChunk.processing_run_id == processing_run_id,
                )
            )
            .order_by(DocumentChunk.chunk_index.asc())
        )
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_existing_embeddings_map(
        session: AsyncSession,
        chunk_ids: List[uuid.UUID],
        embedding_space: str,
    ) -> Dict[uuid.UUID, str]:
        """Retrieves map of {chunk_id: content_hash} for chunks that already have valid embeddings in this space."""
        if not chunk_ids:
            return {}

        query = select(
            DocumentChunkEmbedding.chunk_id,
            DocumentChunkEmbedding.content_hash,
        ).where(
            and_(
                DocumentChunkEmbedding.chunk_id.in_(chunk_ids),
                DocumentChunkEmbedding.embedding_space == embedding_space,
            )
        )
        result = await session.execute(query)
        return {row.chunk_id: row.content_hash for row in result.all()}

    @staticmethod
    async def bulk_upsert_embeddings(
        session: AsyncSession,
        records: List[Dict[str, any]],
    ) -> int:
        """Idempotently upserts embeddings using ON CONFLICT (chunk_id, embedding_space)."""
        if not records:
            return 0

        stmt = insert(DocumentChunkEmbedding).values(records)
        upsert_stmt = stmt.on_conflict_do_update(
            constraint="uq_chunk_embedding_space",
            set_={
                "embedding": stmt.excluded.embedding,
                "content_hash": stmt.excluded.content_hash,
                "created_at": func.current_timestamp(),
            },
        )

        result = await session.execute(upsert_stmt)
        return result.rowcount or len(records)

    @staticmethod
    async def count_embeddings(
        session: AsyncSession,
        processing_run_id: uuid.UUID,
        embedding_space: str,
    ) -> int:
        """Counts total distinct embedded chunks in this space for a processing run."""
        query = select(func.count(DocumentChunkEmbedding.id)).where(
            and_(
                DocumentChunkEmbedding.processing_run_id == processing_run_id,
                DocumentChunkEmbedding.embedding_space == embedding_space,
            )
        )
        result = await session.execute(query)
        return result.scalar() or 0
