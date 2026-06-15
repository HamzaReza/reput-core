"""create llm_pricing table

Revision ID: 0027
Revises: 0026
Create Date: 2026-06-13
"""
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "llm_pricing",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("input_rate", sa.Numeric(12, 6), nullable=False),
        sa.Column("output_rate", sa.Numeric(12, 6), nullable=False),
        sa.Column(
            "effective_from",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_llm_pricing_model", "llm_pricing", ["model"])

    # Seed current rates (USD per 1M tokens) as of the migration date.
    seeded_at = datetime(2026, 6, 13, tzinfo=timezone.utc)
    rates = [
        ("anthropic", "claude-haiku-4-5-20251001", 1.00, 5.00),
        ("anthropic", "claude-sonnet-4-6", 3.00, 15.00),
        ("openai", "gpt-5-mini", 0.125, 1.00),
        ("openai", "gpt-5.4", 2.50, 15.00),
        ("openai", "gpt-5.5", 5.00, 30.00),
    ]
    pricing = sa.table(
        "llm_pricing",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("model", sa.String),
        sa.column("provider", sa.String),
        sa.column("input_rate", sa.Numeric),
        sa.column("output_rate", sa.Numeric),
        sa.column("effective_from", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        pricing,
        [
            {
                "id": uuid.uuid4(),
                "provider": provider,
                "model": model,
                "input_rate": input_rate,
                "output_rate": output_rate,
                "effective_from": seeded_at,
            }
            for (provider, model, input_rate, output_rate) in rates
        ],
    )


def downgrade():
    op.drop_index("ix_llm_pricing_model", table_name="llm_pricing")
    op.drop_table("llm_pricing")
