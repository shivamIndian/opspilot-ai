"""Create agent_workflow_runs table in 'ai' schema for LangGraph workflow execution tracking.

Revision ID: 006_create_agent_workflow_runs_table
Revises: 005_create_agent_tool_executions_table
Create Date: 2026-11-04 11:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "006_create_agent_workflow_runs_table"
down_revision: Union[str, None] = "005_create_agent_tool_executions_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_workflow_runs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("thread_id", sa.String(length=128), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=False),
        sa.Column(
            "workflow_name",
            sa.String(length=100),
            server_default="opspilot_support_workflow",
            nullable=False,
        ),
        sa.Column(
            "workflow_version",
            sa.String(length=50),
            server_default="v1.0",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            server_default="queued",
            nullable=False,
        ),
        sa.Column("intent", sa.String(length=100), nullable=True),
        sa.Column("selected_tool", sa.String(length=100), nullable=True),
        sa.Column(
            "requires_approval",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("proposal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "request_id", name="uq_agent_workflow_org_request"),
        schema="ai",
    )

    op.create_index(
        "idx_agent_workflow_runs_org_id",
        "agent_workflow_runs",
        ["organization_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_workflow_runs_user_id",
        "agent_workflow_runs",
        ["user_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_workflow_runs_request_id",
        "agent_workflow_runs",
        ["request_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_workflow_runs_thread_id",
        "agent_workflow_runs",
        ["thread_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_workflow_runs_status",
        "agent_workflow_runs",
        ["status"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_workflow_runs_created_at",
        "agent_workflow_runs",
        ["created_at"],
        schema="ai",
    )


def downgrade() -> None:
    op.drop_index("idx_agent_workflow_runs_created_at", table_name="agent_workflow_runs", schema="ai")
    op.drop_index("idx_agent_workflow_runs_status", table_name="agent_workflow_runs", schema="ai")
    op.drop_index("idx_agent_workflow_runs_thread_id", table_name="agent_workflow_runs", schema="ai")
    op.drop_index("idx_agent_workflow_runs_request_id", table_name="agent_workflow_runs", schema="ai")
    op.drop_index("idx_agent_workflow_runs_user_id", table_name="agent_workflow_runs", schema="ai")
    op.drop_index("idx_agent_workflow_runs_org_id", table_name="agent_workflow_runs", schema="ai")
    op.drop_table("agent_workflow_runs", schema="ai")
