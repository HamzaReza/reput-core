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
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_trial_expires_at TIMESTAMPTZ")


def downgrade() -> None:
    op.drop_column("users", "pro_trial_expires_at")
    op.drop_column("users", "plan")
