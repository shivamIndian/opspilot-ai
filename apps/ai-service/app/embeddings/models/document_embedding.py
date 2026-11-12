"""SQLAlchemy model for document chunk embeddings in the 'ai' schema."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.document_processing.models.processing_run import Base, DocumentProcessingRun
from app.document_processing.models.document_chunk import DocumentChunk


class DocumentChunkEmbedding(Base):
    """Stores vector embeddings associated with document chunks."""

    __tablename__ = "document_chunk_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "chunk_id",
            "embedding_space",
            name="uq_chunk_embedding_space",
        ),
        Index("idx_doc_embeddings_org_id", "organization_id"),
        Index("idx_doc_embeddings_doc_id", "document_id"),
        Index("idx_doc_embeddings_run_id", "processing_run_id"),
        Index("idx_doc_embeddings_space", "embedding_space"),
        Index("idx_doc_embeddings_chunk_id", "chunk_id"),
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
    chunk_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai.document_chunks.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(150), nullable=False)
    dimensions: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding_space: Mapped[str] = mapped_column(String(255), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    embedding = mapped_column(Vector(1536), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    # Relationships
    chunk: Mapped["DocumentChunk"] = relationship("DocumentChunk", backref="embeddings")
    processing_run: Mapped["DocumentProcessingRun"] = relationship("DocumentProcessingRun")
