"""Semantic vector retrieval engine using PostgreSQL pgvector."""

import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.embeddings.models.document_embedding import DocumentChunkEmbedding
from app.document_processing.models.document_chunk import DocumentChunk
from app.document_processing.models.processing_run import DocumentProcessingRun


class SemanticSearchItem:
    """Internal representation of a semantic vector match."""

    def __init__(
        self,
        chunk_id: uuid.UUID,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
        processing_run_id: uuid.UUID,
        processing_generation: int,
        chunk_index: int,
        content: str,
        char_start: Optional[int],
        char_end: Optional[int],
        page_start: Optional[int],
        page_end: Optional[int],
        section_title: Optional[str],
        chunk_metadata: Dict[str, Any],
        cosine_distance: float,
        cosine_similarity: float,
        rank: int,
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.organization_id = organization_id
        self.processing_run_id = processing_run_id
        self.processing_generation = processing_generation
        self.chunk_index = chunk_index
        self.content = content
        self.char_start = char_start
        self.char_end = char_end
        self.page_start = page_start
        self.page_end = page_end
        self.section_title = section_title
        self.chunk_metadata = chunk_metadata
        self.cosine_distance = cosine_distance
        self.cosine_similarity = cosine_similarity
        self.rank = rank


class SemanticSearchService:
    """Performs tenant-isolated approximate nearest neighbor vector search."""

    async def search(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        query_vector: List[float],
        embedding_space: str,
        limit: int = 50,
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[SemanticSearchItem]:
        """Executes pgvector cosine distance search against ai.document_chunk_embeddings.

        Args:
            session: SQLAlchemy AsyncSession.
            organization_id: Verified tenant organization UUID.
            query_vector: 1536-dim normalized query float vector.
            embedding_space: Exact model space partition (e.g. 'openai:text-embedding-3-small:1536').
            limit: Maximum candidate pool size (default 50).
            document_ids: Optional list of document UUIDs to scope retrieval.

        Returns:
            Ranked list of SemanticSearchItem instances ordered by ascending distance.
        """
        # Distance expression using pgvector cosine_distance (<=> operator)
        distance_expr = DocumentChunkEmbedding.embedding.cosine_distance(query_vector).label("distance")

        # Mandatory filters: Tenant ID & Exact Embedding Space
        conditions = [
            DocumentChunkEmbedding.organization_id == organization_id,
            DocumentChunkEmbedding.embedding_space == embedding_space,
        ]

        if document_ids:
            conditions.append(DocumentChunkEmbedding.document_id.in_(document_ids))

        stmt = (
            select(
                DocumentChunkEmbedding.chunk_id,
                DocumentChunkEmbedding.document_id,
                DocumentChunkEmbedding.organization_id,
                DocumentChunkEmbedding.processing_run_id,
                DocumentProcessingRun.processing_generation,
                DocumentChunk.chunk_index,
                DocumentChunk.content,
                DocumentChunk.char_start,
                DocumentChunk.char_end,
                DocumentChunk.page_start,
                DocumentChunk.page_end,
                DocumentChunk.section_title,
                DocumentChunk.chunk_metadata,
                distance_expr,
            )
            .join(DocumentChunk, DocumentChunk.id == DocumentChunkEmbedding.chunk_id)
            .join(DocumentProcessingRun, DocumentProcessingRun.id == DocumentChunkEmbedding.processing_run_id)
            .where(and_(*conditions))
            .order_by(distance_expr.asc())
            .limit(limit)
        )

        result = await session.execute(stmt)
        rows = result.all()

        items: List[SemanticSearchItem] = []
        for idx, row in enumerate(rows, start=1):
            dist = float(row.distance) if row.distance is not None else 1.0
            # Cosine similarity in range [-1.0, 1.0], normalized/clamped to [0.0, 1.0] for non-negative display
            similarity = round(max(0.0, min(1.0, 1.0 - dist)), 4)

            items.append(
                SemanticSearchItem(
                    chunk_id=row.chunk_id,
                    document_id=row.document_id,
                    organization_id=row.organization_id,
                    processing_run_id=row.processing_run_id,
                    processing_generation=row.processing_generation,
                    chunk_index=row.chunk_index,
                    content=row.content,
                    char_start=row.char_start,
                    char_end=row.char_end,
                    page_start=row.page_start,
                    page_end=row.page_end,
                    section_title=row.section_title,
                    chunk_metadata=row.chunk_metadata or {},
                    cosine_distance=round(dist, 4),
                    cosine_similarity=similarity,
                    rank=idx,
                )
            )

        return items
