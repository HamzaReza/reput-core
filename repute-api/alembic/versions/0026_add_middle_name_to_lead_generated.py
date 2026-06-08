"""add middle_name to lead_generated

Revision ID: 0026
Revises: 0025
Create Date: 2026-06-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_generated",
        sa.Column("middle_name", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("lead_generated", "middle_name")
