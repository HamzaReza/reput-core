"""rename operators table to web_analysts

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-08
"""
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.rename_table("operators", "web_analysts")
    op.execute("ALTER INDEX IF EXISTS ix_operators_email RENAME TO ix_web_analysts_email")
    op.drop_constraint("lead_generated_scanned_by_id_fkey", "lead_generated", type_="foreignkey")
    op.create_foreign_key(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        "web_analysts",
        ["scanned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("lead_generated_scanned_by_id_fkey", "lead_generated", type_="foreignkey")
    op.create_foreign_key(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        "operators",
        ["scanned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.rename_table("web_analysts", "operators")
    op.execute("ALTER INDEX IF EXISTS ix_web_analysts_email RENAME TO ix_operators_email")
