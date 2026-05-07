"""add pre_analysis_summary to lead_generated

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_generated",
        sa.Column("pre_analysis_summary", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("lead_generated", "pre_analysis_summary")
