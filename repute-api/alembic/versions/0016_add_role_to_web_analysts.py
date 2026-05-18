"""add role column to web_analysts

Revision ID: 0016
Revises: 0015
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "web_analysts",
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
            server_default="analyst",
        ),
    )
    op.create_check_constraint(
        "ck_web_analysts_role",
        "web_analysts",
        "role IN ('admin', 'analyst')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_web_analysts_role", "web_analysts", type_="check")
    op.drop_column("web_analysts", "role")
