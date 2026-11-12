"""Create document_processing_runs and document_chunks tables in 'ai' schema.

Revision ID: 002_create_document_processing_tables
Revises: 001_baseline_ai_schema
Create Date: 2026-11-03 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002_create_document_processing_tables"
down_revision: Union[str, None] = "001_baseline_ai_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create document_processing_runs table in ai schema
    op.create_table(
        "document_processing_runs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("processing_generation", sa.Integer(), nullable=False),
        sa.Column("pipeline_version", sa.String(100), nullable=False),
        sa.Column("source_checksum", sa.String(64), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("extraction_method", sa.String(50), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("extracted_char_count", sa.BigInteger(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(100), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="ai",
    )

    op.create_unique_constraint(
        "uq_doc_proc_runs_org_doc_gen",
        "document_processing_runs",
        ["organization_id", "document_id", "processing_generation"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_proc_runs_org_doc",
        "document_processing_runs",
        ["organization_id", "document_id"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_proc_runs_status",
        "document_processing_runs",
        ["status"],
        schema="ai",
    )

    # 2. Create document_chunks table in ai schema
    op.create_table(
        "document_chunks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("processing_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("char_start", sa.BigInteger(), nullable=True),
        sa.Column("char_end", sa.BigInteger(), nullable=True),
        sa.Column("page_start", sa.Integer(), nullable=True),
        sa.Column("page_end", sa.Integer(), nullable=True),
        sa.Column("section_title", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["processing_run_id"],
            ["ai.document_processing_runs.id"],
            name="fk_document_chunks_processing_run",
            ondelete="CASCADE",
        ),
        schema="ai",
    )

    op.create_unique_constraint(
        "uq_doc_chunks_run_chunk_idx",
        "document_chunks",
        ["processing_run_id", "chunk_index"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_chunks_org_id",
        "document_chunks",
        ["organization_id"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_chunks_doc_id",
        "document_chunks",
        ["document_id"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_chunks_run_id",
        "document_chunks",
        ["processing_run_id"],
        schema="ai",
    )


def downgrade() -> None:
    op.drop_table("document_chunks", schema="ai")
    op.drop_table("document_processing_runs", schema="ai")
