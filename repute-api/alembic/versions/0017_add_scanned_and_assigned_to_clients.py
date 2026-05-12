"""add scanned_by and assigned_to columns to clients and lead_generated

Revision ID: 0017
Revises: 0016
Create Date: 2026-05-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("scanned_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True))
    op.add_column("clients", sa.Column("scanned_by_name", sa.String(255), nullable=True))
    op.add_column("clients", sa.Column("scanned_by_role", sa.String(20), nullable=True))
    op.add_column("clients", sa.Column("assigned_to_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True))
    op.add_column("clients", sa.Column("assigned_to_name", sa.String(255), nullable=True))
    op.create_index("ix_clients_scanned_by_id", "clients", ["scanned_by_id"])
    op.create_index("ix_clients_assigned_to_id", "clients", ["assigned_to_id"])

    op.add_column("lead_generated", sa.Column("scanned_by_role", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_index("ix_clients_assigned_to_id", table_name="clients")
    op.drop_index("ix_clients_scanned_by_id", table_name="clients")
    op.drop_column("clients", "assigned_to_name")
    op.drop_column("clients", "assigned_to_id")
    op.drop_column("clients", "scanned_by_role")
    op.drop_column("clients", "scanned_by_name")
    op.drop_column("clients", "scanned_by_id")

    op.drop_column("lead_generated", "scanned_by_role")
