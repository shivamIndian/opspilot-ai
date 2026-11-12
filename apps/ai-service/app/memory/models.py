"""SQLAlchemy declarative models for persistent agent memory in the 'ai' schema."""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    String,
    SmallInteger,
    Integer,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.database.connection import Base


class AgentMemory(Base):
    """Core memory entity storing personal preferences, facts, workflow summaries, or recurring patterns."""

    __tablename__ = "agent_memories"
    __table_args__ = (
        Index("idx_agent_memories_org_user", "organization_id", "user_id"),
        Index("idx_agent_memories_org_user_status", "organization_id", "user_id", "status"),
        Index("idx_agent_memories_content_hash", "organization_id", "user_id", "content_hash"),
        Index("idx_agent_memories_type", "organization_id", "user_id", "memory_type"),
        Index("idx_agent_memories_expires_at", "expires_at"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    memory_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    importance_score: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="5", default=5)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="active", default="active")
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_reference: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    consent_version: Mapped[str] = mapped_column(String(50), nullable=False, server_default="v1.0", default="v1.0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    embeddings: Mapped[list["AgentMemoryEmbedding"]] = relationship(
        "AgentMemoryEmbedding",
        back_populates="memory",
        cascade="all, delete-orphan",
    )


class AgentMemoryEmbedding(Base):
    """Vector embeddings corresponding to verified agent memories."""

    __tablename__ = "agent_memory_embeddings"
    __table_args__ = (
        UniqueConstraint("memory_id", "embedding_space", name="uq_memory_embedding_space"),
        Index("idx_agent_mem_emb_org_user", "organization_id", "user_id"),
        Index("idx_agent_mem_emb_space", "embedding_space"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    memory_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai.agent_memories.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(150), nullable=False)
    dimensions: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding_space: Mapped[str] = mapped_column(String(255), nullable=False)
    embedding = mapped_column(Vector(1536), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
    )

    # Relationship
    memory: Mapped["AgentMemory"] = relationship("AgentMemory", back_populates="embeddings")


class AgentMemorySetting(Base):
    """User-controlled consent and configuration preferences for long-term and episodic memory."""

    __tablename__ = "agent_memory_settings"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_agent_memory_settings_org_user"),
        Index("idx_agent_mem_settings_org_user", "organization_id", "user_id"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    memory_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", default=False)
    memory_extraction_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", default=False)
    episodic_memory_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", default=False)
    retention_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    consent_version: Mapped[str] = mapped_column(String(50), nullable=False, server_default="v1.0", default="v1.0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AgentConversationSummary(Base):
    """Compact episodic summary of recurring workflow interactions."""

    __tablename__ = "agent_conversation_summaries"
    __table_args__ = (
        Index("idx_agent_conv_sum_org_user", "organization_id", "user_id"),
        Index("idx_agent_conv_sum_lookup", "organization_id", "user_id", "conversation_id"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    summary_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0", default=0)
    summary_version: Mapped[str] = mapped_column(String(50), nullable=False, server_default="v1.0", default="v1.0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AgentMemoryEvent(Base):
    """Audit events tracking lifecycle, access, consent changes, and rejection of candidate memories."""

    __tablename__ = "agent_memory_events"
    __table_args__ = (
        Index("idx_agent_mem_events_org_user", "organization_id", "user_id"),
        Index("idx_agent_mem_events_type", "event_type"),
        Index("idx_agent_mem_events_created_at", "created_at"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    memory_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    metadata_: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, server_default="{}", default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        default=datetime.utcnow,
    )
