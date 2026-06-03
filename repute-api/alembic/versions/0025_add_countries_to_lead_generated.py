"""add countries to lead_generated

Revision ID: 0025
Revises: 0024
Create Date: 2026-06-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lead_generated",
        sa.Column("countries", postgresql.JSONB(), nullable=True),
    )
    op.execute("""
        UPDATE lead_generated
        SET countries = json_build_array(country)::jsonb
        WHERE country IS NOT NULL AND countries IS NULL
    """)


def downgrade() -> None:
    op.drop_column("lead_generated", "countries")
