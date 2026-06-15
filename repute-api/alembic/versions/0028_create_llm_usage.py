"""create llm_usage table

Revision ID: 0028
Revises: 0027
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "llm_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "web_analyst_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("web_analysts.id"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("generate_lead_jobs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("operation", sa.String(40), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("scan_tier", sa.String(20), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reasoning_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column(
            "pricing_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("llm_pricing.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_llm_usage_created_at", "llm_usage", ["created_at"])
    op.create_index("ix_llm_usage_web_analyst_id", "llm_usage", ["web_analyst_id"])
    op.create_index("ix_llm_usage_job_id", "llm_usage", ["job_id"])


def downgrade():
    op.drop_index("ix_llm_usage_job_id", table_name="llm_usage")
    op.drop_index("ix_llm_usage_web_analyst_id", table_name="llm_usage")
    op.drop_index("ix_llm_usage_created_at", table_name="llm_usage")
    op.drop_table("llm_usage")
