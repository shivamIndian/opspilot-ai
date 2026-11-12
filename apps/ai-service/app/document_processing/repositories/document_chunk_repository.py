"""Repository for ai.document_chunks persistence."""

import uuid
from typing import List
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.document_processing.models.document_chunk import DocumentChunk
from app.document_processing.chunking.chunk_metadata import RawChunk


class DocumentChunkRepository:
    """Manages transactional insertion and querying of document chunks in ai schema."""

    async def bulk_insert_chunks(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_run_id: uuid.UUID,
        chunks: List[RawChunk],
    ) -> int:
        if not chunks:
            return 0

        # Idempotent delete of any existing chunks for this run
        await session.execute(
            delete(DocumentChunk).where(DocumentChunk.processing_run_id == processing_run_id)
        )

        entities: List[DocumentChunk] = []
        for c in chunks:
            entities.append(
                DocumentChunk(
                    organization_id=organization_id,
                    document_id=document_id,
                    processing_run_id=processing_run_id,
                    chunk_index=c.chunk_index,
                    content=c.content,
                    content_hash=c.content_hash,
                    char_start=c.char_start,
                    char_end=c.char_end,
                    page_start=c.page_start,
                    page_end=c.page_end,
                    section_title=c.section_title,
                    chunk_metadata=c.metadata,
                )
            )

        session.add_all(entities)
        await session.flush()
        return len(entities)

    async def get_by_run(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_run_id: uuid.UUID,
    ) -> List[DocumentChunk]:
        stmt = (
            select(DocumentChunk)
            .where(
                DocumentChunk.organization_id == organization_id,
                DocumentChunk.document_id == document_id,
                DocumentChunk.processing_run_id == processing_run_id,
            )
            .order_by(DocumentChunk.chunk_index)
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())


document_chunk_repository = DocumentChunkRepository()
