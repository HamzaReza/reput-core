"""add scan_depth to users

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-07

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE IF NOT EXISTS scandepth AS ENUM ('Standard', 'Deep', 'Thorough')")
    op.add_column(
        "users",
        sa.Column(
            "scan_depth",
            sa.Enum("Standard", "Deep", "Thorough", name="scandepth"),
            nullable=False,
            server_default="Standard",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "scan_depth")
    op.execute("DROP TYPE scandepth")
