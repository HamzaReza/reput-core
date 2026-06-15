"""Persist per-call LLM token usage and a cost snapshot, attributed to a WebAnalyst.

Kept separate from the LLM helpers (which stay dependency-light) and uses its
own DB session so a usage write can never corrupt a scan's transaction or, on
failure, break lead generation.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.usage import LLMPricing, LLMUsage
from app.utils.llm import UsageTokens

logger = logging.getLogger(__name__)


async def get_effective_rate(
    session: AsyncSession, model: str, at: datetime
) -> LLMPricing | None:
    """Pricing row for `model` with the greatest effective_from <= at."""
    stmt = (
        select(LLMPricing)
        .where(LLMPricing.model == model, LLMPricing.effective_from <= at)
        .order_by(LLMPricing.effective_from.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


def compute_cost(usage: UsageTokens, input_rate: float, output_rate: float) -> float:
    """USD cost for one call. Rates are USD per 1M tokens. reasoning is already
    inside output, so it is not billed separately."""
    return usage.input / 1_000_000 * input_rate + usage.output / 1_000_000 * output_rate


def normalize_subject(subject_label: str | None) -> str | None:
    """Trim and cap the researched-subject label to the column width; '' → None."""
    if not subject_label:
        return None
    return subject_label.strip()[:255] or None


async def record_llm_usage(
    *,
    web_analyst_id: uuid.UUID | None,
    job_id: uuid.UUID | None,
    operation: str,
    provider: str,
    model: str,
    scan_tier: str | None,
    usage: UsageTokens | None,
    subject_label: str | None = None,
) -> None:
    """Insert one llm_usage row with a cost snapshot priced at the effective rate.
    Never raises — a tracking failure must not break the scan it measures."""
    if web_analyst_id is None or usage is None:
        return
    try:
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as session:
            rate = await get_effective_rate(session, model, now)
            cost = (
                compute_cost(usage, float(rate.input_rate), float(rate.output_rate))
                if rate is not None
                else 0.0
            )
            session.add(
                LLMUsage(
                    web_analyst_id=web_analyst_id,
                    job_id=job_id,
                    operation=operation,
                    provider=provider,
                    model=model,
                    scan_tier=scan_tier,
                    subject_label=normalize_subject(subject_label),
                    input_tokens=usage.input,
                    output_tokens=usage.output,
                    reasoning_tokens=usage.reasoning,
                    total_tokens=usage.total,
                    cost_usd=cost,
                    pricing_id=rate.id if rate is not None else None,
                )
            )
            await session.commit()
    except Exception:
        logger.exception(
            "failed to record llm usage (operation=%s model=%s)", operation, model
        )
