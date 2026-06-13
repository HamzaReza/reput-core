import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LLMPricing(Base):
    __tablename__ = "llm_pricing"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    # USD per 1,000,000 tokens
    input_rate: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False)
    output_rate: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False)
    # Rates are append-only; the row with the greatest effective_from <= a call's
    # timestamp is the rate that applied to it.
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class LLMUsage(Base):
    __tablename__ = "llm_usage"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    web_analyst_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id"), nullable=False, index=True
    )
    # null for pre-analysis (synchronous, no job row)
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("generate_lead_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    operation: Mapped[str] = mapped_column(String(40), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    scan_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # OpenAI reasoning tokens; informational only — already counted in output_tokens
    reasoning_tokens: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Snapshot computed at write time from the effective rate; never recomputed on read
    cost_usd: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False, default=0)
    pricing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("llm_pricing.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
