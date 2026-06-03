"""add subject_type and countries to clients

Revision ID: 0022
Revises: 0021
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("subject_type", sa.String(20), nullable=True, server_default="individual"),
    )
    op.add_column(
        "clients",
        sa.Column("countries", postgresql.JSONB(), nullable=True),
    )
    op.execute("""
        UPDATE clients
        SET subject_type = 'individual',
            countries    = json_build_array(country)::jsonb
        WHERE subject_type IS NULL OR countries IS NULL
    """)
    op.create_index("ix_clients_subject_type", "clients", ["subject_type"])


def downgrade() -> None:
    op.drop_index("ix_clients_subject_type", table_name="clients")
    op.drop_column("clients", "countries")
    op.drop_column("clients", "subject_type")
