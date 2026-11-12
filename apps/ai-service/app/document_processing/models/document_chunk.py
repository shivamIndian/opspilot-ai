"""SQLAlchemy model for document chunks in the 'ai' schema."""

import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import (
    String,
    Integer,
    BigInteger,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    Computed,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.document_processing.models.processing_run import Base, DocumentProcessingRun


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint(
            "processing_run_id",
            "chunk_index",
            name="uq_doc_chunks_run_chunk_idx",
        ),
        Index("idx_doc_chunks_org_id", "organization_id"),
        Index("idx_doc_chunks_doc_id", "document_id"),
        Index("idx_doc_chunks_run_id", "processing_run_id"),
        Index("idx_doc_chunks_search_vector", "search_vector", postgresql_using="gin"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    processing_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai.document_processing_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    char_start: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    char_end: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    page_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chunk_metadata: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    search_vector = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('simple', coalesce(content, ''))", persisted=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    processing_run: Mapped["DocumentProcessingRun"] = relationship(
        "DocumentProcessingRun", back_populates="chunks"
    )
