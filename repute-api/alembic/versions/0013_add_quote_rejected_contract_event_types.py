"""add quote_rejected and contract_created event types

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-07
"""
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_client_events_type", "client_events", type_="check")
    op.create_check_constraint(
        "ck_client_events_type",
        "client_events",
        "event_type IN ('research','scan','quote_sent','quote_accepted','quote_rejected','contract_created','meeting_set')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_client_events_type", "client_events", type_="check")
    op.create_check_constraint(
        "ck_client_events_type",
        "client_events",
        "event_type IN ('research','scan','quote_sent','quote_accepted','meeting_set')",
    )
