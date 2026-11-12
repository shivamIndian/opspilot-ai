"""Create document_chunk_embeddings table with HNSW index in 'ai' schema.

Revision ID: 003_create_document_chunk_embeddings_table
Revises: 002_create_document_processing_tables
Create Date: 2026-11-03 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "003_create_document_chunk_embeddings_table"
down_revision: Union[str, None] = "002_create_document_processing_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check whether pgvector extension is available in the PostgreSQL engine
    conn = op.get_bind()
    vector_available = (
        conn.execute(
            sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
        ).scalar()
        is not None
    )

    if vector_available:
        op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector;"))
        embedding_type = Vector(1536)
    else:
        # Fallback to standard array for environments without pgvector C extension
        embedding_type = postgresql.ARRAY(sa.Float())

    # 1. Create document_chunk_embeddings table in ai schema
    op.create_table(
        "document_chunk_embeddings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("processing_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("model", sa.String(150), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=False),
        sa.Column("embedding_space", sa.String(255), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("embedding", embedding_type, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["processing_run_id"],
            ["ai.document_processing_runs.id"],
            name="fk_chunk_embeddings_processing_run",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["chunk_id"],
            ["ai.document_chunks.id"],
            name="fk_chunk_embeddings_chunk",
            ondelete="CASCADE",
        ),
        schema="ai",
    )

    # 2. Constraints and B-Tree Indexes
    op.create_unique_constraint(
        "uq_chunk_embedding_space",
        "document_chunk_embeddings",
        ["chunk_id", "embedding_space"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_embeddings_org_id",
        "document_chunk_embeddings",
        ["organization_id"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_embeddings_doc_id",
        "document_chunk_embeddings",
        ["document_id"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_embeddings_run_id",
        "document_chunk_embeddings",
        ["processing_run_id"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_embeddings_space",
        "document_chunk_embeddings",
        ["embedding_space"],
        schema="ai",
    )
    op.create_index(
        "idx_doc_embeddings_chunk_id",
        "document_chunk_embeddings",
        ["chunk_id"],
        schema="ai",
    )

    # 3. Create HNSW Cosine Vector Index if vector extension is enabled
    if vector_available:
        op.execute(
            sa.text(
                """
                CREATE INDEX idx_doc_chunk_embeddings_hnsw 
                ON ai.document_chunk_embeddings 
                USING hnsw (embedding vector_cosine_ops) 
                WITH (m = 16, ef_construction = 64);
                """
            )
        )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ai.idx_doc_chunk_embeddings_hnsw;"))
    op.drop_table("document_chunk_embeddings", schema="ai")
