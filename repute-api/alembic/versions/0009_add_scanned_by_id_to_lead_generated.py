"""add scanned_by_id to lead_generated

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_generated",
        sa.Column(
            "scanned_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_lead_generated_scanned_by_id",
        "lead_generated",
        ["scanned_by_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_lead_generated_scanned_by_id", table_name="lead_generated")
    op.drop_column("lead_generated", "scanned_by_id")
