"""drop legacy uq_clients_name_country unique index

Revision ID: 0023
Revises: 0022
Create Date: 2026-05-26
"""
from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Created in 0012 as a unique index on (name, country).
    # For company clients name="" always, so any two companies sharing the same
    # first country triggered a UniqueViolationError. Dedup is now handled in
    # application code using (subject_type, name/company, countries).
    op.drop_index("uq_clients_name_country", table_name="clients")


def downgrade() -> None:
    op.create_index("uq_clients_name_country", "clients", ["name", "country"], unique=True)
