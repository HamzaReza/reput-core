"""rename employees table to operators

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-07
"""
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.rename_table("employees", "operators")
    op.execute("ALTER INDEX IF EXISTS ix_employees_email RENAME TO ix_operators_email")
    # Recreate the named FK on lead_generated so it references the renamed table
    op.drop_constraint("lead_generated_scanned_by_id_fkey", "lead_generated", type_="foreignkey")
    op.create_foreign_key(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        "operators",
        ["scanned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("lead_generated_scanned_by_id_fkey", "lead_generated", type_="foreignkey")
    op.create_foreign_key(
        "lead_generated_scanned_by_id_fkey",
        "lead_generated",
        "employees",
        ["scanned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.rename_table("operators", "employees")
    op.execute("ALTER INDEX IF EXISTS ix_operators_email RENAME TO ix_employees_email")
