"""add current_step to generate_lead_jobs

Revision ID: 0024
Revises: 0023
Create Date: 2026-05-27
"""
import sqlalchemy as sa
from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "generate_lead_jobs",
        sa.Column("current_step", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("generate_lead_jobs", "current_step")
