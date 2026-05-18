"""drop notes column from clients table

Revision ID: 0019
Revises: 0018
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE clients DROP COLUMN IF EXISTS notes")


def downgrade() -> None:
    op.add_column("clients", sa.Column("notes", sa.Text, nullable=True))
