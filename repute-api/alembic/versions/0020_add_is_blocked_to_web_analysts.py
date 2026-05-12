"""add is_blocked column to web_analysts

Revision ID: 0020
Revises: 0019
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "web_analysts",
        sa.Column(
            "is_blocked",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("web_analysts", "is_blocked")
