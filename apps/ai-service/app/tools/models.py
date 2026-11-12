"""SQLAlchemy model for AI agent tool execution auditing."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Float, DateTime, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.connection import Base


class AgentToolExecution(Base):
    """Audit log of AI agent tool execution events."""

    __tablename__ = "agent_tool_executions"
    __table_args__ = (
        Index("idx_agent_tool_exec_org_id", "organization_id"),
        Index("idx_agent_tool_exec_request_id", "request_id"),
        Index("idx_agent_tool_exec_tool_name", "tool_name"),
        Index("idx_agent_tool_exec_created_at", "created_at"),
        {"schema": "ai"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    request_id: Mapped[str] = mapped_column(String(128), nullable=False)
    execution_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    tool_name: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    execution_status: Mapped[str] = mapped_column(String(32), nullable=False)
    input_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    output_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
