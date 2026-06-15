"""add subject_label to llm_usage

Revision ID: 0029
Revises: 0028
Create Date: 2026-06-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "llm_usage",
        sa.Column("subject_label", sa.String(255), nullable=True),
    )


def downgrade():
    op.drop_column("llm_usage", "subject_label")
