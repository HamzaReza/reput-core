"""add email and phone to clients table

Revision ID: 0018
Revises: 0017
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("clients", sa.Column("phone", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "phone")
    op.drop_column("clients", "email")
