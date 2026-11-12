"""Pydantic schemas for the RAG retrieval engine."""

import uuid
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RetrievalMode(str, Enum):
    HYBRID = "hybrid"
    SEMANTIC = "semantic"
    KEYWORD = "keyword"


class RetrievalFilters(BaseModel):
    """Optional metadata and scope filters for retrieval."""
    document_ids: Optional[List[uuid.UUID]] = Field(default=None, description="Scope search to specific documents")
    file_types: Optional[List[str]] = Field(default=None, description="Filter by file extension")
    date_from: Optional[str] = Field(default=None, description="ISO timestamp for start date")
    date_to: Optional[str] = Field(default=None, description="ISO timestamp for end date")


class InternalSearchRequest(BaseModel):
    """Request payload sent by Node.js to trigger RAG retrieval."""
    organization_id: uuid.UUID
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    retrieval_mode: RetrievalMode = Field(default=RetrievalMode.HYBRID)
    embedding_space: str = Field(description="Target embedding space string, e.g. openai:text-embedding-3-small:1536")
    filters: Optional[RetrievalFilters] = None
    rrf_k: int = Field(default=60, ge=1, le=100, description="Reciprocal Rank Fusion smoothing constant")
    semantic_weight: float = Field(default=1.0, ge=0.0, le=10.0)
    keyword_weight: float = Field(default=1.0, ge=0.0, le=10.0)
    min_score: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Minimum similarity or fusion score threshold")
    max_chunks_per_doc: Optional[int] = Field(default=None, ge=1, description="Max chunks allowed per document for diversity")


class CandidateChunk(BaseModel):
    """Candidate chunk returned by retrieval with exact source tracking."""
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    organization_id: uuid.UUID
    processing_run_id: uuid.UUID
    processing_generation: int
    chunk_index: int
    content: str
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section_title: Optional[str] = None
    chunk_metadata: Dict[str, Any] = Field(default_factory=dict)
    semantic_rank: Optional[int] = None
    semantic_score: Optional[float] = None
    keyword_rank: Optional[int] = None
    keyword_score: Optional[float] = None
    score: float
    score_type: str = Field(description="'rrf', 'cosine_similarity', or 'ts_rank_cd'")
    retrieval_method: str = Field(description="'semantic', 'keyword', or 'hybrid'")


class SearchDiagnostics(BaseModel):
    """Performance telemetry and debugging diagnostics for retrieval."""
    query_normalized: str
    embedding_space: str
    semantic_candidates: int
    keyword_candidates: int
    combined_candidates: int
    returned_results: int
    embedding_duration_ms: int = 0
    search_duration_ms: int = 0
    total_duration_ms: int = 0
    degraded_mode: Optional[str] = None


class InternalSearchData(BaseModel):
    organization_id: uuid.UUID
    query: str
    retrieval_mode: str
    embedding_space: str
    result_count: int
    results: List[CandidateChunk]
    diagnostics: SearchDiagnostics


class InternalSearchResponse(BaseModel):
    """Envelope response returned to Node.js backend."""
    success: bool = True
    data: InternalSearchData
