"""Pydantic schemas for Agent Memory management, retrieval, settings, and extraction."""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class MemoryType(str, Enum):
    PREFERENCE = "preference"
    CONTEXTUAL_FACT = "contextual_fact"
    WORKFLOW_SUMMARY = "workflow_summary"
    RECURRING_PATTERN = "recurring_pattern"


class MemoryStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DELETED = "deleted"


class MemorySourceType(str, Enum):
    USER_EXPLICIT = "user_explicit"
    AGENT_PROPOSED = "agent_proposed"
    SYSTEM_INFERRED = "system_inferred"


class MemoryCandidateProposal(BaseModel):
    """Memory proposed by agent extraction awaiting explicit user approval."""
    candidate_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    memory_type: MemoryType = Field(..., description="Classification of the proposed memory")
    category: str = Field(..., max_length=50, description="Short category, e.g. 'ui_preference', 'dev_environment'")
    title: str = Field(..., max_length=200, description="Concise descriptive title")
    content: str = Field(..., max_length=2000, description="The distilled factual memory content")
    importance_score: int = Field(default=5, ge=1, le=10, description="Heuristic importance score from 1 to 10")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Model confidence score")
    reasoning: str = Field(..., description="Why this memory is useful for future interactions")

    model_config = ConfigDict(from_attributes=True)


class MemoryCreateRequest(BaseModel):
    """Payload to create or confirm a long-term memory."""
    memory_type: MemoryType = Field(..., description="Type of memory")
    category: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=4000)
    importance_score: int = Field(default=5, ge=1, le=10)
    source_type: Optional[str] = Field(default=MemorySourceType.USER_EXPLICIT.value)
    source_reference: Optional[uuid.UUID] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    consent_version: str = Field(default="v1.0")

    model_config = ConfigDict(from_attributes=True)


class MemoryUpdateRequest(BaseModel):
    """Payload to update an existing memory."""
    category: Optional[str] = Field(default=None, max_length=50)
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = Field(default=None, max_length=4000)
    importance_score: Optional[int] = Field(default=None, ge=1, le=10)
    status: Optional[MemoryStatus] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)

    model_config = ConfigDict(from_attributes=True)


class MemoryResponse(BaseModel):
    """API representation of a stored memory item."""
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    memory_type: str
    category: str
    title: str
    content: str
    content_hash: str
    importance_score: int
    status: str
    source_type: Optional[str] = None
    source_reference: Optional[uuid.UUID] = None
    consent_version: str
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MemoryListResponse(BaseModel):
    """Paginated response of user memories."""
    items: List[MemoryResponse]
    total: int
    limit: int
    offset: int


class MemorySettingsResponse(BaseModel):
    """User memory settings and consent status."""
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    memory_enabled: bool
    memory_extraction_enabled: bool
    episodic_memory_enabled: bool
    retention_days: Optional[int] = None
    consent_version: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemorySettingsUpdateRequest(BaseModel):
    """Update user consent and retention configuration."""
    memory_enabled: Optional[bool] = None
    memory_extraction_enabled: Optional[bool] = None
    episodic_memory_enabled: Optional[bool] = None
    retention_days: Optional[int] = Field(default=None, ge=1, le=3650)
    consent_version: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MemorySearchRequest(BaseModel):
    """Query to semantically search user memories."""
    query: str = Field(..., min_length=1, max_length=1000)
    memory_type: Optional[MemoryType] = None
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.6, ge=0.0, le=1.0)


class MemorySearchResultItem(BaseModel):
    """Individual retrieved memory with similarity score."""
    memory: MemoryResponse
    score: float
    citation_text: str

    model_config = ConfigDict(from_attributes=True)


class MemorySearchResponse(BaseModel):
    """Search results response."""
    results: List[MemorySearchResultItem]
    total: int
    query: str


class MemoryExtractionRequest(BaseModel):
    """Request to extract candidate memories from conversation messages."""
    conversation_id: str
    messages: List[Dict[str, Any]] = Field(..., min_length=1)
    workflow_context: Optional[Dict[str, Any]] = None


class MemoryCandidateListResponse(BaseModel):
    """Extracted memory suggestions awaiting user confirmation."""
    candidates: List[MemoryCandidateProposal]
    conversation_id: str
    detected_count: int


class MemoryBulkDeleteResponse(BaseModel):
    """Result of purging all memories for a user."""
    deleted_count: int
    user_id: uuid.UUID
    organization_id: uuid.UUID
    status: str = "success"


class ConversationSummaryCreateRequest(BaseModel):
    """Create an episodic conversation summary."""
    conversation_id: str
    summary: str = Field(..., min_length=5, max_length=4000)
    message_count: int = Field(default=0, ge=0)
    summary_version: str = Field(default="v1.0")


class ConversationSummaryResponse(BaseModel):
    """Episodic summary response."""
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    conversation_id: str
    summary: str
    summary_hash: str
    message_count: int
    summary_version: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
