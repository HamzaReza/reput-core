"""add employees and lead_generated tables

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_employees_email", "employees", ["email"],
                    unique=True, if_not_exists=True)

    op.create_table(
        "lead_generated",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("scanned_by_name", sa.String(255), nullable=True),
        sa.Column("scanned_by_email", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("company", sa.String(255), nullable=True),
        sa.Column("country", sa.String(255), nullable=True),
        sa.Column("background", sa.Text, nullable=True),
        sa.Column("keywords_suggested", JSONB, nullable=True, server_default="[]"),
        sa.Column("links", JSONB, nullable=True),
        sa.Column("summary", JSONB, nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("researched_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=True),
        if_not_exists=True,
    )
    op.create_index("ix_lead_generated_scanned_by_email", "lead_generated",
                    ["scanned_by_email"], if_not_exists=True)


def downgrade() -> None:
    op.drop_table("lead_generated")
    op.drop_table("employees")
