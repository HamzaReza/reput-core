"""add feedbacks table

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feedbacks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        if_not_exists=True,
    )
    # For installs where create_all already created the table without the email column
    op.execute("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS email VARCHAR(255)")


def downgrade() -> None:
    op.drop_table("feedbacks")
