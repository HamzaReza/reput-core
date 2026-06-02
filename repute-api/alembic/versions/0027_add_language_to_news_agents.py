"""add language to news_agents

Revision ID: 0027
Revises: 0026
Create Date: 2026-06-02
"""
import sqlalchemy as sa
from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "news_agents",
        sa.Column("language", sa.String(20), nullable=False, server_default="English"),
    )


def downgrade() -> None:
    op.drop_column("news_agents", "language")
