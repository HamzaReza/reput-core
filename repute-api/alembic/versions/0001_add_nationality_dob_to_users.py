"""add nationality and date_of_birth to users

Revision ID: 0001
Revises:
Create Date: 2026-04-07

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE")


def downgrade() -> None:
    op.drop_column("users", "date_of_birth")
    op.drop_column("users", "nationality")
