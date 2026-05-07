"""fix scanned_by_id FK to reference employees instead of users

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        "employees",
        ["scanned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        "users",
        ["scanned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
