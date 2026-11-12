"""SQLAlchemy model for document processing runs in the 'ai' schema."""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Integer,
    BigInteger,
    DateTime,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class DocumentProcessingRun(Base):
    __tablename__ = "document_processing_runs"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "document_id",
            "processing_generation",
            name="uq_doc_proc_runs_org_doc_gen",
        ),
        Index("idx_doc_proc_runs_org_doc", "organization_id", "document_id"),
        Index("idx_doc_proc_runs_status", "status"),
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
    processing_generation: Mapped[int] = mapped_column(Integer, nullable=False)
    pipeline_version: Mapped[str] = mapped_column(String(100), nullable=False)
    source_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    extraction_method: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    extracted_char_count: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    error_code: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
    )

    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="processing_run",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )
