"""Add multi-step execution tracking columns to agent_workflow_runs table in 'ai' schema.

Revision ID: 007_add_multistep_execution_columns
Revises: 006_create_agent_workflow_runs_table
Create Date: 2026-11-04 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "007_add_multistep_execution_columns"
down_revision: Union[str, None] = "006_create_agent_workflow_runs_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agent_workflow_runs",
        sa.Column("current_step", sa.String(length=100), nullable=True),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("total_steps", sa.Integer(), server_default="0", nullable=False),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("completed_steps_count", sa.Integer(), server_default="0", nullable=False),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("tool_call_count", sa.Integer(), server_default="0", nullable=False),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("replan_count", sa.Integer(), server_default="0", nullable=False),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("execution_summary", sa.Text(), nullable=True),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("final_response", sa.Text(), nullable=True),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column(
            "citations",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column(
            "action_proposals",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        schema="ai",
    )
    op.add_column(
        "agent_workflow_runs",
        sa.Column("duration_ms", sa.Float(), nullable=True),
        schema="ai",
    )


def downgrade() -> None:
    op.drop_column("agent_workflow_runs", "duration_ms", schema="ai")
    op.drop_column("agent_workflow_runs", "action_proposals", schema="ai")
    op.drop_column("agent_workflow_runs", "citations", schema="ai")
    op.drop_column("agent_workflow_runs", "final_response", schema="ai")
    op.drop_column("agent_workflow_runs", "execution_summary", schema="ai")
    op.drop_column("agent_workflow_runs", "replan_count", schema="ai")
    op.drop_column("agent_workflow_runs", "tool_call_count", schema="ai")
    op.drop_column("agent_workflow_runs", "completed_steps_count", schema="ai")
    op.drop_column("agent_workflow_runs", "total_steps", schema="ai")
    op.drop_column("agent_workflow_runs", "current_step", schema="ai")
