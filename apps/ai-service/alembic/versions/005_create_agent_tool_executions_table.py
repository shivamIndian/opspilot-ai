"""Create agent_tool_executions table in 'ai' schema for audit logging.

Revision ID: 005_create_agent_tool_executions_table
Revises: 004_add_fts_to_document_chunks
Create Date: 2026-11-04 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005_create_agent_tool_executions_table"
down_revision: Union[str, None] = "004_add_fts_to_document_chunks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_tool_executions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=False),
        sa.Column("execution_id", sa.String(length=128), nullable=False),
        sa.Column("tool_name", sa.String(length=64), nullable=False),
        sa.Column("risk_level", sa.String(length=32), nullable=False),
        sa.Column("execution_status", sa.String(length=32), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=True),
        sa.Column("output_summary", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("execution_id"),
        schema="ai",
    )

    op.create_index(
        "idx_agent_tool_exec_org_id",
        "agent_tool_executions",
        ["organization_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_tool_exec_request_id",
        "agent_tool_executions",
        ["request_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_tool_exec_tool_name",
        "agent_tool_executions",
        ["tool_name"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_tool_exec_created_at",
        "agent_tool_executions",
        ["created_at"],
        schema="ai",
    )


def downgrade() -> None:
    op.drop_index("idx_agent_tool_exec_created_at", table_name="agent_tool_executions", schema="ai")
    op.drop_index("idx_agent_tool_exec_tool_name", table_name="agent_tool_executions", schema="ai")
    op.drop_index("idx_agent_tool_exec_request_id", table_name="agent_tool_executions", schema="ai")
    op.drop_index("idx_agent_tool_exec_org_id", table_name="agent_tool_executions", schema="ai")
    op.drop_table("agent_tool_executions", schema="ai")
