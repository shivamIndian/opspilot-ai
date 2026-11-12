"""Main orchestrator for RAG retrieval operations."""

import time
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.retrieval.schemas import (
    InternalSearchRequest,
    InternalSearchResponse,
    InternalSearchData,
    CandidateChunk,
    SearchDiagnostics,
    RetrievalMode,
)
from app.retrieval.services.query_normalizer import QueryNormalizer
from app.retrieval.services.query_embedding_service import QueryEmbeddingService
from app.retrieval.services.semantic_search_service import SemanticSearchService, SemanticSearchItem
from app.retrieval.services.keyword_search_service import KeywordSearchService, KeywordSearchItem
from app.retrieval.services.rrf_fusion_service import RrfFusionService

logger = get_logger("retrieval_service")

CANDIDATE_POOL_LIMIT = 50


class RetrievalService:
    """Coordinates query normalization, embedding generation, semantic & keyword search, and RRF fusion."""

    def __init__(
        self,
        query_normalizer: Optional[QueryNormalizer] = None,
        query_embedding_service: Optional[QueryEmbeddingService] = None,
        semantic_search_service: Optional[SemanticSearchService] = None,
        keyword_search_service: Optional[KeywordSearchService] = None,
        rrf_fusion_service: Optional[RrfFusionService] = None,
    ):
        self.normalizer = query_normalizer or QueryNormalizer()
        self.embedding_service = query_embedding_service or QueryEmbeddingService()
        self.semantic_search = semantic_search_service or SemanticSearchService()
        self.keyword_search = keyword_search_service or KeywordSearchService()
        self.fusion_service = rrf_fusion_service or RrfFusionService()

    async def search(
        self,
        session: AsyncSession,
        request: InternalSearchRequest,
    ) -> InternalSearchResponse:
        """Executes tenant-isolated search matching the requested mode."""
        start_total = time.perf_counter()

        # 1. Normalize query
        normalized_query = self.normalizer.normalize(request.query)

        document_ids: Optional[List[uuid.UUID]] = (
            request.filters.document_ids if request.filters else None
        )

        semantic_candidates: List[SemanticSearchItem] = []
        keyword_candidates: List[KeywordSearchItem] = []
        degraded_mode: Optional[str] = None

        embedding_duration_ms = 0

        # 2. Semantic retrieval branch
        if request.retrieval_mode in (RetrievalMode.HYBRID, RetrievalMode.SEMANTIC):
            try:
                emb_start = time.perf_counter()
                query_vector = await self.embedding_service.generate_query_embedding(
                    query=normalized_query,
                    embedding_space=request.embedding_space,
                )
                embedding_duration_ms = int((time.perf_counter() - emb_start) * 1000)

                semantic_candidates = await self.semantic_search.search(
                    session=session,
                    organization_id=request.organization_id,
                    query_vector=query_vector,
                    embedding_space=request.embedding_space,
                    limit=CANDIDATE_POOL_LIMIT,
                    document_ids=document_ids,
                )
            except Exception as e:
                logger.warning(f"Semantic search failed (pgvector unavailable or error): {e}. Falling back to keyword search.")
                try:
                    await session.rollback()
                except Exception:
                    pass
                degraded_mode = "semantic_search_unavailable"
                semantic_candidates = []

        # 3. Keyword retrieval branch
        if request.retrieval_mode in (RetrievalMode.HYBRID, RetrievalMode.KEYWORD) or degraded_mode:
            try:
                keyword_candidates = await self.keyword_search.search(
                    session=session,
                    organization_id=request.organization_id,
                    query=normalized_query,
                    limit=CANDIDATE_POOL_LIMIT,
                    document_ids=document_ids,
                )
            except Exception as e:
                logger.warn(f"Keyword search failed: {str(e)}")
                if request.retrieval_mode == RetrievalMode.HYBRID:
                    degraded_mode = "keyword_search_unavailable"
                else:
                    raise

        # 4. Result combination and ranking based on mode
        final_results: List[CandidateChunk] = []

        if request.retrieval_mode == RetrievalMode.HYBRID:
            final_results = self.fusion_service.fuse_and_rank(
                semantic_items=semantic_candidates,
                keyword_items=keyword_candidates,
                top_k=request.top_k,
                rrf_k=request.rrf_k,
                semantic_weight=request.semantic_weight,
                keyword_weight=request.keyword_weight,
                min_score=request.min_score,
                max_chunks_per_doc=request.max_chunks_per_doc,
            )

        elif request.retrieval_mode == RetrievalMode.SEMANTIC:
            for item in semantic_candidates[: request.top_k]:
                if request.min_score is not None and item.cosine_similarity < request.min_score:
                    continue
                final_results.append(
                    CandidateChunk(
                        chunk_id=item.chunk_id,
                        document_id=item.document_id,
                        organization_id=item.organization_id,
                        processing_run_id=item.processing_run_id,
                        processing_generation=item.processing_generation,
                        chunk_index=item.chunk_index,
                        content=item.content,
                        char_start=item.char_start,
                        char_end=item.char_end,
                        page_start=item.page_start,
                        page_end=item.page_end,
                        section_title=item.section_title,
                        chunk_metadata=item.chunk_metadata,
                        semantic_rank=item.rank,
                        semantic_score=item.cosine_similarity,
                        keyword_rank=None,
                        keyword_score=None,
                        score=item.cosine_similarity,
                        score_type="cosine_similarity",
                        retrieval_method="semantic",
                    )
                )

        elif request.retrieval_mode == RetrievalMode.KEYWORD:
            for item in keyword_candidates[: request.top_k]:
                if request.min_score is not None and item.keyword_score < request.min_score:
                    continue
                final_results.append(
                    CandidateChunk(
                        chunk_id=item.chunk_id,
                        document_id=item.document_id,
                        organization_id=item.organization_id,
                        processing_run_id=item.processing_run_id,
                        processing_generation=item.processing_generation,
                        chunk_index=item.chunk_index,
                        content=item.content,
                        char_start=item.char_start,
                        char_end=item.char_end,
                        page_start=item.page_start,
                        page_end=item.page_end,
                        section_title=item.section_title,
                        chunk_metadata=item.chunk_metadata,
                        semantic_rank=None,
                        semantic_score=None,
                        keyword_rank=item.rank,
                        keyword_score=item.keyword_score,
                        score=item.keyword_score,
                        score_type="ts_rank_cd",
                        retrieval_method="keyword",
                    )
                )

        total_duration_ms = int((time.perf_counter() - start_total) * 1000)
        search_duration_ms = max(0, total_duration_ms - embedding_duration_ms)

        diagnostics = SearchDiagnostics(
            query_normalized=normalized_query,
            embedding_space=request.embedding_space,
            semantic_candidates=len(semantic_candidates),
            keyword_candidates=len(keyword_candidates),
            combined_candidates=len(semantic_candidates) + len(keyword_candidates),
            returned_results=len(final_results),
            embedding_duration_ms=embedding_duration_ms,
            search_duration_ms=search_duration_ms,
            total_duration_ms=total_duration_ms,
            degraded_mode=degraded_mode,
        )

        return InternalSearchResponse(
            success=True,
            data=InternalSearchData(
                organization_id=request.organization_id,
                query=request.query,
                retrieval_mode=request.retrieval_mode.value,
                embedding_space=request.embedding_space,
                result_count=len(final_results),
                results=final_results,
                diagnostics=diagnostics,
            ),
        )


retrieval_service = RetrievalService()
