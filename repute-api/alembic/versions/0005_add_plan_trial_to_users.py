"""add plan and pro_trial_expires_at to users

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-09

"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("plan", sa.String(20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("pro_trial_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "pro_trial_expires_at")
    op.drop_column("users", "plan")
