"""Reciprocal Rank Fusion (RRF) and candidate deduplication service."""

import uuid
from typing import List, Dict, Optional
from app.retrieval.schemas import CandidateChunk
from app.retrieval.services.semantic_search_service import SemanticSearchItem
from app.retrieval.services.keyword_search_service import KeywordSearchItem


class RrfFusionService:
    """Combines semantic and keyword ranked lists using Reciprocal Rank Fusion."""

    @staticmethod
    def fuse_and_rank(
        semantic_items: List[SemanticSearchItem],
        keyword_items: List[KeywordSearchItem],
        top_k: int = 5,
        rrf_k: int = 60,
        semantic_weight: float = 1.0,
        keyword_weight: float = 1.0,
        min_score: Optional[float] = None,
        max_chunks_per_doc: Optional[int] = None,
    ) -> List[CandidateChunk]:
        """Performs Reciprocal Rank Fusion over semantic and keyword result sets.

        Formula:
            RRF Score(c) = (W_sem / (rrf_k + r_sem)) + (W_kw / (rrf_k + r_kw))

        Args:
            semantic_items: Ranked candidate items from vector search (1-based rank).
            keyword_items: Ranked candidate items from full-text search (1-based rank).
            top_k: Maximum final results to return.
            rrf_k: Smoothing constant (default 60).
            semantic_weight: Multiplier for semantic contribution.
            keyword_weight: Multiplier for keyword contribution.
            min_score: Optional minimum score threshold.
            max_chunks_per_doc: Optional diversity limit per document.

        Returns:
            Deduplicated, fused CandidateChunk list sorted by descending RRF score.
        """
        # Intermediate aggregation map keyed by chunk_id
        chunk_map: Dict[uuid.UUID, Dict] = {}

        # 1. Ingest semantic candidates
        for item in semantic_items:
            rrf_contrib = semantic_weight / (rrf_k + item.rank)
            chunk_map[item.chunk_id] = {
                "chunk_id": item.chunk_id,
                "document_id": item.document_id,
                "organization_id": item.organization_id,
                "processing_run_id": item.processing_run_id,
                "processing_generation": item.processing_generation,
                "chunk_index": item.chunk_index,
                "content": item.content,
                "char_start": item.char_start,
                "char_end": item.char_end,
                "page_start": item.page_start,
                "page_end": item.page_end,
                "section_title": item.section_title,
                "chunk_metadata": item.chunk_metadata,
                "semantic_rank": item.rank,
                "semantic_score": item.cosine_similarity,
                "keyword_rank": None,
                "keyword_score": None,
                "rrf_score": rrf_contrib,
                "sources": {"semantic"},
            }

        # 2. Ingest keyword candidates and merge
        for item in keyword_items:
            rrf_contrib = keyword_weight / (rrf_k + item.rank)
            if item.chunk_id in chunk_map:
                entry = chunk_map[item.chunk_id]
                entry["keyword_rank"] = item.rank
                entry["keyword_score"] = item.keyword_score
                entry["rrf_score"] += rrf_contrib
                entry["sources"].add("keyword")
            else:
                chunk_map[item.chunk_id] = {
                    "chunk_id": item.chunk_id,
                    "document_id": item.document_id,
                    "organization_id": item.organization_id,
                    "processing_run_id": item.processing_run_id,
                    "processing_generation": item.processing_generation,
                    "chunk_index": item.chunk_index,
                    "content": item.content,
                    "char_start": item.char_start,
                    "char_end": item.char_end,
                    "page_start": item.page_start,
                    "page_end": item.page_end,
                    "section_title": item.section_title,
                    "chunk_metadata": item.chunk_metadata,
                    "semantic_rank": None,
                    "semantic_score": None,
                    "keyword_rank": item.rank,
                    "keyword_score": item.keyword_score,
                    "rrf_score": rrf_contrib,
                    "sources": {"keyword"},
                }

        # 3. Sort all candidates by descending RRF score
        candidates = list(chunk_map.values())
        candidates.sort(key=lambda x: x["rrf_score"], reverse=True)

        # 4. Optional diversity control & min_score filtering
        final_candidates: List[CandidateChunk] = []
        doc_chunk_counts: Dict[uuid.UUID, int] = {}

        for c in candidates:
            score = round(c["rrf_score"], 6)

            if min_score is not None and score < min_score:
                continue

            doc_id = c["document_id"]
            if max_chunks_per_doc is not None:
                current_doc_chunks = doc_chunk_counts.get(doc_id, 0)
                if current_doc_chunks >= max_chunks_per_doc:
                    # Skip if diversity limit reached for this document
                    continue

            # Determine retrieval method
            sources = c["sources"]
            if "semantic" in sources and "keyword" in sources:
                method = "hybrid"
            elif "semantic" in sources:
                method = "semantic"
            else:
                method = "keyword"

            final_candidates.append(
                CandidateChunk(
                    chunk_id=c["chunk_id"],
                    document_id=c["document_id"],
                    organization_id=c["organization_id"],
                    processing_run_id=c["processing_run_id"],
                    processing_generation=c["processing_generation"],
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    char_start=c["char_start"],
                    char_end=c["char_end"],
                    page_start=c["page_start"],
                    page_end=c["page_end"],
                    section_title=c["section_title"],
                    chunk_metadata=c["chunk_metadata"],
                    semantic_rank=c["semantic_rank"],
                    semantic_score=c["semantic_score"],
                    keyword_rank=c["keyword_rank"],
                    keyword_score=c["keyword_score"],
                    score=score,
                    score_type="rrf",
                    retrieval_method=method,
                )
            )

            doc_chunk_counts[doc_id] = doc_chunk_counts.get(doc_id, 0) + 1

            if len(final_candidates) >= top_k:
                break

        return final_candidates
