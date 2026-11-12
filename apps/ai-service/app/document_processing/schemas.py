"""Pydantic schemas for internal document processing requests and responses."""

import uuid
from typing import Optional
from pydantic import BaseModel, Field


class ProcessDocumentResponse(BaseModel):
    """Payload returned to Node.js backend after processing execution."""
    success: bool = True
    processing_run_id: uuid.UUID
    organization_id: uuid.UUID
    document_id: uuid.UUID
    processing_generation: int
    status: str
    page_count: Optional[int] = None
    extracted_char_count: int = 0
    chunk_count: int = 0
    pipeline_version: str
    error_code: Optional[str] = None


class ProcessingRunSummary(BaseModel):
    """Summary of an existing processing run."""
    id: uuid.UUID
    organization_id: uuid.UUID
    document_id: uuid.UUID
    processing_generation: int
    status: str
    page_count: Optional[int] = None
    extracted_char_count: Optional[int] = None
    chunk_count: int = 0
    pipeline_version: str
    error_code: Optional[str] = None
