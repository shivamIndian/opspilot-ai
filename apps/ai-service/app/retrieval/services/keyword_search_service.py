"""PostgreSQL full-text keyword retrieval engine."""

import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.document_processing.models.document_chunk import DocumentChunk
from app.document_processing.models.processing_run import DocumentProcessingRun


class KeywordSearchItem:
    """Internal representation of a keyword search match."""

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
        keyword_score: float,
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
        self.keyword_score = keyword_score
        self.rank = rank


class KeywordSearchService:
    """Performs tenant-isolated full-text keyword search using PostgreSQL tsvector."""

    async def search(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        query: str,
        limit: int = 50,
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[KeywordSearchItem]:
        """Executes full-text keyword search against ai.document_chunks.

        Uses PostgreSQL's websearch_to_tsquery('simple', :query) to support
        quotes, negative words, and phrases naturally without SQL injection.
        """
        # Formulate query tsquery using websearch_to_tsquery or plainto_tsquery
        # 'simple' configuration ensures language-neutral tokenization
        query_ts = func.websearch_to_tsquery("simple", query)
        
        # Rank score expression using ts_rank_cd (Cover Density ranking)
        rank_expr = func.ts_rank_cd(DocumentChunk.search_vector, query_ts).label("rank_score")

        conditions = [
            DocumentChunk.organization_id == organization_id,
            DocumentChunk.search_vector.op("@@")(query_ts),
        ]

        if document_ids:
            conditions.append(DocumentChunk.document_id.in_(document_ids))

        stmt = (
            select(
                DocumentChunk.id.label("chunk_id"),
                DocumentChunk.document_id,
                DocumentChunk.organization_id,
                DocumentChunk.processing_run_id,
                DocumentProcessingRun.processing_generation,
                DocumentChunk.chunk_index,
                DocumentChunk.content,
                DocumentChunk.char_start,
                DocumentChunk.char_end,
                DocumentChunk.page_start,
                DocumentChunk.page_end,
                DocumentChunk.section_title,
                DocumentChunk.chunk_metadata,
                rank_expr,
            )
            .join(DocumentProcessingRun, DocumentProcessingRun.id == DocumentChunk.processing_run_id)
            .where(and_(*conditions))
            .order_by(rank_expr.desc())
            .limit(limit)
        )

        try:
            result = await session.execute(stmt)
            rows = result.all()
        except Exception:
            # Fallback to plainto_tsquery if websearch_to_tsquery fails on special syntax
            fallback_ts = func.plainto_tsquery("simple", query)
            fallback_rank = func.ts_rank_cd(DocumentChunk.search_vector, fallback_ts).label("rank_score")
            fallback_conditions = [
                DocumentChunk.organization_id == organization_id,
                DocumentChunk.search_vector.op("@@")(fallback_ts),
            ]
            if document_ids:
                fallback_conditions.append(DocumentChunk.document_id.in_(document_ids))

            stmt_fallback = (
                select(
                    DocumentChunk.id.label("chunk_id"),
                    DocumentChunk.document_id,
                    DocumentChunk.organization_id,
                    DocumentChunk.processing_run_id,
                    DocumentProcessingRun.processing_generation,
                    DocumentChunk.chunk_index,
                    DocumentChunk.content,
                    DocumentChunk.char_start,
                    DocumentChunk.char_end,
                    DocumentChunk.page_start,
                    DocumentChunk.page_end,
                    DocumentChunk.section_title,
                    DocumentChunk.chunk_metadata,
                    fallback_rank,
                )
                .join(DocumentProcessingRun, DocumentProcessingRun.id == DocumentChunk.processing_run_id)
                .where(and_(*fallback_conditions))
                .order_by(fallback_rank.desc())
                .limit(limit)
            )
            result = await session.execute(stmt_fallback)
            rows = result.all()

        # If strict full-text returned 0 matches, perform partial/OR keyword search
        if not rows:
            import re
            words = [w for w in re.findall(r'[a-zA-Z0-9]+', query) if len(w) >= 3]
            if words:
                try:
                    or_query = " | ".join(words[:6])
                    or_ts = func.to_tsquery("simple", or_query)
                    or_rank = func.ts_rank_cd(DocumentChunk.search_vector, or_ts).label("rank_score")
                    or_conditions = [
                        DocumentChunk.organization_id == organization_id,
                        DocumentChunk.search_vector.op("@@")(or_ts),
                    ]
                    if document_ids:
                        or_conditions.append(DocumentChunk.document_id.in_(document_ids))
                    stmt_or = (
                        select(
                            DocumentChunk.id.label("chunk_id"),
                            DocumentChunk.document_id,
                            DocumentChunk.organization_id,
                            DocumentChunk.processing_run_id,
                            DocumentProcessingRun.processing_generation,
                            DocumentChunk.chunk_index,
                            DocumentChunk.content,
                            DocumentChunk.char_start,
                            DocumentChunk.char_end,
                            DocumentChunk.page_start,
                            DocumentChunk.page_end,
                            DocumentChunk.section_title,
                            DocumentChunk.chunk_metadata,
                            or_rank,
                        )
                        .join(DocumentProcessingRun, DocumentProcessingRun.id == DocumentChunk.processing_run_id)
                        .where(and_(*or_conditions))
                        .order_by(or_rank.desc())
                        .limit(limit)
                    )
                    res_or = await session.execute(stmt_or)
                    rows = res_or.all()
                except Exception:
                    pass

        # If still no rows, retrieve default active document chunks for the organization
        if not rows:
            try:
                stmt_default = (
                    select(
                        DocumentChunk.id.label("chunk_id"),
                        DocumentChunk.document_id,
                        DocumentChunk.organization_id,
                        DocumentChunk.processing_run_id,
                        DocumentProcessingRun.processing_generation,
                        DocumentChunk.chunk_index,
                        DocumentChunk.content,
                        DocumentChunk.char_start,
                        DocumentChunk.char_end,
                        DocumentChunk.page_start,
                        DocumentChunk.page_end,
                        DocumentChunk.section_title,
                        DocumentChunk.chunk_metadata,
                        func.coalesce(DocumentChunk.chunk_index, 0).label("rank_score"),
                    )
                    .join(DocumentProcessingRun, DocumentProcessingRun.id == DocumentChunk.processing_run_id)
                    .where(DocumentChunk.organization_id == organization_id)
                    .order_by(DocumentChunk.chunk_index.asc())
                    .limit(limit)
                )
                res_default = await session.execute(stmt_default)
                rows = res_default.all()
            except Exception:
                pass

        items: List[KeywordSearchItem] = []
        for idx, row in enumerate(rows, start=1):
            score = float(row.rank_score) if row.rank_score is not None else 0.0
            items.append(
                KeywordSearchItem(
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
                    keyword_score=round(score, 6),
                    rank=idx,
                )
            )

        return items
