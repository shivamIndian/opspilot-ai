"""Baseline migration establishing and verifying the 'ai' schema.

Revision ID: 001_baseline_ai_schema
Revises: 
Create Date: 2026-11-03 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_baseline_ai_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure the 'ai' schema exists and is commented
    op.execute("CREATE SCHEMA IF NOT EXISTS ai;")
    op.execute("COMMENT ON SCHEMA ai IS 'OpsPilot Cognitive Engine & Vector Embeddings Domain';")


def downgrade() -> None:
    # Do not drop schema in baseline rollback to protect data integrity
    op.execute("COMMENT ON SCHEMA ai IS NULL;")
