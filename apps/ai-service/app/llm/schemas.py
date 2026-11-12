"""Pydantic schemas and models for LLM operations and structured output."""

import re
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class SourceContextItem(BaseModel):
    """Normalized source context item supplied to the LLM."""

    source_id: str = Field(
        ...,
        description="Stable source identifier formatted as S1, S2, etc.",
    )
    document_id: str = Field(..., description="Parent document UUID")
    chunk_id: str = Field(..., description="Document chunk UUID")
    content: str = Field(..., description="Extracted text chunk content")
    document_name: str = Field(..., description="Document title or display name")
    original_filename: Optional[str] = Field(default=None, description="Original filename")
    file_extension: Optional[str] = Field(default=None, description="File extension without dot")
    page_start: Optional[int] = Field(default=None, description="Starting page (1-based)")
    page_end: Optional[int] = Field(default=None, description="Ending page (1-based)")
    section_title: Optional[str] = Field(default=None, description="Hierarchical section heading")
    char_start: Optional[int] = Field(default=None, description="Character start offset")
    char_end: Optional[int] = Field(default=None, description="Character end offset")
    relevance_score: Optional[float] = Field(default=None, description="Retrieval similarity score")
    processing_generation: Optional[int] = Field(default=None, description="Indexing run generation")

    @field_validator("source_id")
    @classmethod
    def validate_source_id(cls, v: str) -> str:
        if not re.match(r"^S\d+$", v.strip()):
            raise ValueError(f"Invalid source_id format: '{v}'. Expected format 'S1', 'S2', etc.")
        return v.strip()


class StructuredAnswer(BaseModel):
    """Guaranteed structured output schema returned by the LLM."""

    answer: str = Field(
        ...,
        description="Factual, grounded answer to the user query based strictly on supplied sources.",
    )
    cited_source_ids: List[str] = Field(
        default_factory=list,
        description="List of source IDs (e.g. ['S1', 'S2']) directly supporting the answer.",
    )
    insufficient_evidence: bool = Field(
        default=False,
        description="True if the supplied sources do not contain sufficient evidence to answer.",
    )
    limitations: List[str] = Field(
        default_factory=list,
        description="Known omissions, contradictory statements, or ambiguities in sources.",
    )
    follow_up_questions: List[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions to help the user clarify or explore further.",
    )


class LLMUsage(BaseModel):
    """Token usage metrics reported by the provider."""

    input_tokens: Optional[int] = Field(default=None, description="Prompt / input token count")
    output_tokens: Optional[int] = Field(default=None, description="Completion / output token count")
    total_tokens: Optional[int] = Field(default=None, description="Total tokens consumed")


class LLMMetadata(BaseModel):
    """Telemetry and operational metadata for the generation run."""

    provider: str = Field(..., description="Provider name (e.g., openai, mock)")
    model: str = Field(..., description="Model identifier (e.g., gpt-4o-mini)")
    prompt_version: str = Field(..., description="Version of the system prompt utilized")
    retrieval_mode: Optional[str] = Field(default=None, description="Retrieval mode (hybrid/semantic/keyword)")
    usage: LLMUsage = Field(default_factory=LLMUsage, description="Token consumption metrics")
    latency_ms: Optional[float] = Field(default=None, description="Total generation latency in milliseconds")


class InternalLLMGenerateRequest(BaseModel):
    """Request payload for internal Python LLM generation endpoint."""

    request_id: Optional[str] = Field(default=None, description="Correlation ID for tracing")
    organization_id: str = Field(..., description="Tenant organization UUID")
    query: str = Field(..., min_length=1, max_length=5000, description="User query")
    prompt_version: str = Field(default="rag_assistant_v1", description="System prompt version")
    retrieval_mode: Optional[str] = Field(default="hybrid", description="Retrieval mode")
    sources: List[SourceContextItem] = Field(
        default_factory=list,
        description="Authoritative and validated source items from retrieval",
    )
    max_output_tokens: Optional[int] = Field(default=None, ge=1, le=4096)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class InternalLLMGenerateData(BaseModel):
    """Data payload inside successful internal LLM response."""

    request_id: Optional[str] = Field(default=None)
    answer: str
    cited_source_ids: List[str] = Field(default_factory=list)
    insufficient_evidence: bool = False
    limitations: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    metadata: LLMMetadata


class InternalLLMGenerateResponse(BaseModel):
    """Standardized response from internal generation endpoint."""

    success: bool = True
    data: InternalLLMGenerateData
