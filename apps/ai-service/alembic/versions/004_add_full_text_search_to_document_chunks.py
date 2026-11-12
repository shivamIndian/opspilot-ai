"""Add full text search vector and GIN index to document_chunks table in 'ai' schema.

Revision ID: 004_add_fts_to_document_chunks
Revises: 003_create_document_chunk_embeddings_table
Create Date: 2026-11-03 22:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_add_fts_to_document_chunks"
down_revision: Union[str, None] = "003_create_document_chunk_embeddings_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add generated tsvector column for language-neutral 'simple' text search
    op.add_column(
        "document_chunks",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('simple', coalesce(content, ''))", persisted=True),
            nullable=True,
        ),
        schema="ai",
    )

    # 2. Create GIN index for high-performance full-text search
    op.create_index(
        "idx_doc_chunks_search_vector",
        "document_chunks",
        ["search_vector"],
        postgresql_using="gin",
        schema="ai",
    )


def downgrade() -> None:
    op.drop_index(
        "idx_doc_chunks_search_vector",
        table_name="document_chunks",
        schema="ai",
    )
    op.drop_column("document_chunks", "search_vector", schema="ai")
