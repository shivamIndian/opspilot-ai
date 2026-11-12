"""Pydantic schemas for internal embedding requests and responses."""

import uuid
from typing import Optional
from pydantic import BaseModel, Field


class GenerateEmbeddingsRequest(BaseModel):
    """Payload sent by Node.js worker to trigger embedding generation."""
    organization_id: uuid.UUID
    document_id: uuid.UUID
    processing_generation: int = Field(ge=1)
    embedding_generation: int = Field(ge=1)
    provider: Optional[str] = None
    model: Optional[str] = None
    dimensions: Optional[int] = None
    embedding_space: Optional[str] = None


class EmbeddingSummary(BaseModel):
    """Sanitized telemetry summary returned after embedding execution."""
    organization_id: uuid.UUID
    document_id: uuid.UUID
    embedding_generation: int
    provider: str
    model: str
    dimensions: int
    embedding_space: str
    total_chunks: int
    embedded_chunks: int
    failed_chunks: int = 0
    status: str
    duration_ms: int = 0


class GenerateEmbeddingsResponse(BaseModel):
    """Envelope response for embedding generation endpoint."""
    success: bool = True
    data: EmbeddingSummary
