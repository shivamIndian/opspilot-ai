"""SQLAlchemy data model for LangGraph workflow run tracking in PostgreSQL 'ai' schema."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Float,
    Text,
    DateTime,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database.connection import Base


class AgentWorkflowRun(Base):
    __tablename__ = "agent_workflow_runs"
    __table_args__ = {"schema": "ai"}

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    thread_id = Column(String(128), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    request_id = Column(String(128), nullable=False, index=True)
    workflow_name = Column(String(100), nullable=False, default="opspilot_support_workflow")
    workflow_version = Column(String(50), nullable=False, default="v1.0")
    status = Column(String(50), nullable=False, default="queued", index=True)
    intent = Column(String(100), nullable=True)
    selected_tool = Column(String(100), nullable=True)
    requires_approval = Column(Boolean, nullable=False, default=False)
    proposal_id = Column(UUID(as_uuid=True), nullable=True)
    error_code = Column(String(100), nullable=True)

    # Multi-Step Execution Telemetry (Module 13)
    current_step = Column(String(100), nullable=True)
    total_steps = Column(Integer, nullable=False, default=0)
    completed_steps_count = Column(Integer, nullable=False, default=0)
    tool_call_count = Column(Integer, nullable=False, default=0)
    replan_count = Column(Integer, nullable=False, default=0)
    execution_summary = Column(Text, nullable=True)
    final_response = Column(Text, nullable=True)
    citations = Column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    action_proposals = Column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    duration_ms = Column(Float, nullable=True)

    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
