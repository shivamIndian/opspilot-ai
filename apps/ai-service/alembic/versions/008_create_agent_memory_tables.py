"""Create agent memory tables with pgvector HNSW index in 'ai' schema.

Revision ID: 008_create_agent_memory_tables
Revises: 007_add_multistep_execution_columns
Create Date: 2026-11-04 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "008_create_agent_memory_tables"
down_revision: Union[str, None] = "007_add_multistep_execution_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. ai.agent_memories table
    op.create_table(
        "agent_memories",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("memory_type", sa.String(50), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("importance_score", sa.SmallInteger(), nullable=False, server_default="5"),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("source_type", sa.String(50), nullable=True),
        sa.Column("source_reference", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("consent_version", sa.String(50), nullable=False, server_default="v1.0"),
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
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        schema="ai",
    )

    op.create_index(
        "idx_agent_memories_org_user",
        "agent_memories",
        ["organization_id", "user_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_memories_org_user_status",
        "agent_memories",
        ["organization_id", "user_id", "status"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_memories_content_hash",
        "agent_memories",
        ["organization_id", "user_id", "content_hash"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_memories_type",
        "agent_memories",
        ["organization_id", "user_id", "memory_type"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_memories_expires_at",
        "agent_memories",
        ["expires_at"],
        schema="ai",
    )

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
        embedding_type = postgresql.ARRAY(sa.Float())

    # 2. ai.agent_memory_embeddings table
    op.create_table(
        "agent_memory_embeddings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "memory_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ai.agent_memories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("model", sa.String(150), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=False),
        sa.Column("embedding_space", sa.String(255), nullable=False),
        sa.Column("embedding", embedding_type, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("memory_id", "embedding_space", name="uq_memory_embedding_space"),
        schema="ai",
    )

    op.create_index(
        "idx_agent_mem_emb_org_user",
        "agent_memory_embeddings",
        ["organization_id", "user_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_mem_emb_space",
        "agent_memory_embeddings",
        ["embedding_space"],
        schema="ai",
    )

    # HNSW Cosine Index on memory embeddings if vector extension is enabled
    if vector_available:
        op.execute(
            sa.text(
                """
                CREATE INDEX idx_agent_mem_embeddings_hnsw
                ON ai.agent_memory_embeddings
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
                """
            )
        )

    # 3. ai.agent_memory_settings table
    op.create_table(
        "agent_memory_settings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("memory_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("memory_extraction_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("episodic_memory_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("retention_days", sa.Integer(), nullable=True),
        sa.Column("consent_version", sa.String(50), nullable=False, server_default="v1.0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_agent_memory_settings_org_user"),
        schema="ai",
    )

    op.create_index(
        "idx_agent_mem_settings_org_user",
        "agent_memory_settings",
        ["organization_id", "user_id"],
        schema="ai",
    )

    # 4. ai.agent_conversation_summaries table
    op.create_table(
        "agent_conversation_summaries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("summary_hash", sa.String(64), nullable=False),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary_version", sa.String(50), nullable=False, server_default="v1.0"),
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

    op.create_index(
        "idx_agent_conv_sum_org_user",
        "agent_conversation_summaries",
        ["organization_id", "user_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_conv_sum_lookup",
        "agent_conversation_summaries",
        ["organization_id", "user_id", "conversation_id"],
        schema="ai",
    )

    # 5. ai.agent_memory_events table
    op.create_table(
        "agent_memory_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("memory_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        schema="ai",
    )

    op.create_index(
        "idx_agent_mem_events_org_user",
        "agent_memory_events",
        ["organization_id", "user_id"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_mem_events_type",
        "agent_memory_events",
        ["event_type"],
        schema="ai",
    )
    op.create_index(
        "idx_agent_mem_events_created_at",
        "agent_memory_events",
        ["created_at"],
        schema="ai",
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ai.idx_agent_mem_embeddings_hnsw;"))
    op.drop_table("agent_memory_events", schema="ai")
    op.drop_table("agent_conversation_summaries", schema="ai")
    op.drop_table("agent_memory_settings", schema="ai")
    op.drop_table("agent_memory_embeddings", schema="ai")
    op.drop_table("agent_memories", schema="ai")
