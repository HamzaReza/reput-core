import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import WebAnalyst
from app.models.usage import LLMPricing, LLMUsage
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/usage", tags=["usage"])


def _require_admin(web_analyst: WebAnalyst) -> None:
    if web_analyst.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")


def _parse_range(frm: str | None, to: str | None) -> tuple[datetime, datetime]:
    """Parse UTC ISO instants from the client; default to the last 30 days.
    Naive inputs are assumed UTC so comparisons against tz-aware columns hold."""
    def _utc(s: str) -> datetime:
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    end = _utc(to) if to else now
    start = _utc(frm) if frm else end - timedelta(days=30)
    return start, end


def _clamp_limit(limit: int, lo: int = 1, hi: int = 1000) -> int:
    """Bound the call-log page size to a safe range."""
    return max(lo, min(limit, hi))


@router.get("/summary")
async def usage_summary(
    frm: str | None = Query(None, alias="from"),
    to: str | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    _require_admin(current_web_analyst)
    start, end = _parse_range(frm, to)
    window = (LLMUsage.created_at >= start, LLMUsage.created_at <= end)

    totals = (
        await db.execute(
            select(
                func.coalesce(func.sum(LLMUsage.input_tokens), 0),
                func.coalesce(func.sum(LLMUsage.output_tokens), 0),
                func.coalesce(func.sum(LLMUsage.total_tokens), 0),
                func.coalesce(func.sum(LLMUsage.cost_usd), 0),
                func.count(LLMUsage.id),
                func.count(func.distinct(LLMUsage.job_id)),
            ).where(*window)
        )
    ).one()

    by_provider = (
        await db.execute(
            select(
                LLMUsage.provider,
                func.sum(LLMUsage.cost_usd),
                func.sum(LLMUsage.total_tokens),
            )
            .where(*window)
            .group_by(LLMUsage.provider)
        )
    ).all()

    by_model = (
        await db.execute(
            select(
                LLMUsage.model,
                LLMUsage.provider,
                func.sum(LLMUsage.cost_usd),
                func.sum(LLMUsage.total_tokens),
                func.count(LLMUsage.id),
            )
            .where(*window)
            .group_by(LLMUsage.model, LLMUsage.provider)
            .order_by(func.sum(LLMUsage.cost_usd).desc())
        )
    ).all()

    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "totals": {
            "inputTokens": int(totals[0]),
            "outputTokens": int(totals[1]),
            "totalTokens": int(totals[2]),
            "costUsd": float(totals[3]),
            "calls": int(totals[4]),
            "scans": int(totals[5]),
        },
        "byProvider": [
            {"provider": p, "costUsd": float(c), "totalTokens": int(t)}
            for (p, c, t) in by_provider
        ],
        "byModel": [
            {
                "model": m,
                "provider": p,
                "costUsd": float(c),
                "totalTokens": int(t),
                "calls": int(n),
            }
            for (m, p, c, t, n) in by_model
        ],
    }


@router.get("/by-analyst")
async def usage_by_analyst(
    frm: str | None = Query(None, alias="from"),
    to: str | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    _require_admin(current_web_analyst)
    start, end = _parse_range(frm, to)

    rows = (
        await db.execute(
            select(
                LLMUsage.web_analyst_id,
                WebAnalyst.name,
                WebAnalyst.email,
                func.sum(LLMUsage.cost_usd),
                func.sum(LLMUsage.total_tokens),
                func.count(func.distinct(LLMUsage.job_id)),
                func.count(LLMUsage.id),
            )
            .join(WebAnalyst, WebAnalyst.id == LLMUsage.web_analyst_id)
            .where(LLMUsage.created_at >= start, LLMUsage.created_at <= end)
            .group_by(LLMUsage.web_analyst_id, WebAnalyst.name, WebAnalyst.email)
            .order_by(func.sum(LLMUsage.cost_usd).desc())
        )
    ).all()

    return {
        "analysts": [
            {
                "webAnalystId": str(wid),
                "name": name,
                "email": email,
                "costUsd": float(cost),
                "totalTokens": int(tokens),
                "scans": int(scans),
                "calls": int(calls),
            }
            for (wid, name, email, cost, tokens, scans, calls) in rows
        ]
    }


@router.get("/by-analyst/{analyst_id}")
async def usage_by_analyst_detail(
    analyst_id: uuid.UUID,
    frm: str | None = Query(None, alias="from"),
    to: str | None = Query(None, alias="to"),
    limit: int = Query(200),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    """Per-analyst drill-down: spend grouped by researched subject + a call log."""
    _require_admin(current_web_analyst)
    analyst = await db.get(WebAnalyst, analyst_id)
    if analyst is None:
        raise HTTPException(status_code=404, detail="Analyst not found")
    start, end = _parse_range(frm, to)
    limit = _clamp_limit(limit)
    window = (
        LLMUsage.web_analyst_id == analyst_id,
        LLMUsage.created_at >= start,
        LLMUsage.created_at <= end,
    )

    totals = (
        await db.execute(
            select(
                func.coalesce(func.sum(LLMUsage.total_tokens), 0),
                func.coalesce(func.sum(LLMUsage.cost_usd), 0),
                func.count(LLMUsage.id),
                func.count(func.distinct(LLMUsage.job_id)),
            ).where(*window)
        )
    ).one()

    by_subject = (
        await db.execute(
            select(
                LLMUsage.subject_label,
                func.sum(LLMUsage.cost_usd),
                func.sum(LLMUsage.total_tokens),
                func.count(LLMUsage.id),
            )
            .where(*window)
            .group_by(LLMUsage.subject_label)
            .order_by(func.sum(LLMUsage.cost_usd).desc())
        )
    ).all()

    calls = (
        await db.execute(
            select(
                LLMUsage.created_at,
                LLMUsage.subject_label,
                LLMUsage.operation,
                LLMUsage.provider,
                LLMUsage.model,
                LLMUsage.scan_tier,
                LLMUsage.total_tokens,
                LLMUsage.cost_usd,
                LLMUsage.job_id,
            )
            .where(*window)
            .order_by(LLMUsage.created_at.desc())
            .limit(limit)
        )
    ).all()

    return {
        "analyst": {
            "id": str(analyst.id),
            "name": analyst.name,
            "email": analyst.email,
        },
        "from": start.isoformat(),
        "to": end.isoformat(),
        "totals": {
            "totalTokens": int(totals[0]),
            "costUsd": float(totals[1]),
            "calls": int(totals[2]),
            "scans": int(totals[3]),
        },
        "bySubject": [
            {
                "subject": subj,
                "costUsd": float(cost),
                "totalTokens": int(tokens),
                "calls": int(n),
            }
            for (subj, cost, tokens, n) in by_subject
        ],
        "calls": [
            {
                "createdAt": created.isoformat(),
                "subject": subj,
                "operation": op,
                "provider": prov,
                "model": model,
                "scanTier": tier,
                "totalTokens": int(tokens),
                "costUsd": float(cost),
                "jobId": str(job_id) if job_id else None,
            }
            for (created, subj, op, prov, model, tier, tokens, cost, job_id) in calls
        ],
    }


@router.get("/timeseries")
async def usage_timeseries(
    frm: str | None = Query(None, alias="from"),
    to: str | None = Query(None, alias="to"),
    bucket: str = Query("day"),
    tz: str = Query("UTC"),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    _require_admin(current_web_analyst)
    if bucket not in ("day", "week"):
        raise HTTPException(status_code=422, detail="bucket must be 'day' or 'week'")
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(status_code=422, detail="Invalid IANA timezone")
    start, end = _parse_range(frm, to)

    # Truncate to the caller's local day/week so buckets follow the browser zone.
    bucket_expr = func.date_trunc(bucket, func.timezone(tz, LLMUsage.created_at))

    rows = (
        await db.execute(
            select(
                bucket_expr.label("bucket"),
                func.sum(LLMUsage.cost_usd),
                func.sum(LLMUsage.total_tokens),
                func.count(LLMUsage.id),
            )
            .where(LLMUsage.created_at >= start, LLMUsage.created_at <= end)
            .group_by(bucket_expr)
            .order_by(bucket_expr)
        )
    ).all()

    return {
        "tz": tz,
        "bucket": bucket,
        "points": [
            {
                "bucket": b.isoformat() if hasattr(b, "isoformat") else str(b),
                "costUsd": float(c),
                "totalTokens": int(t),
                "calls": int(n),
            }
            for (b, c, t, n) in rows
        ],
    }


@router.get("/pricing")
async def list_pricing(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    _require_admin(current_web_analyst)
    # DISTINCT ON (model) ordered by effective_from desc → current rate per model.
    rows = (
        await db.execute(
            select(LLMPricing)
            .distinct(LLMPricing.model)
            .order_by(LLMPricing.model, LLMPricing.effective_from.desc())
        )
    ).scalars().all()

    return {
        "rates": [
            {
                "id": str(r.id),
                "model": r.model,
                "provider": r.provider,
                "inputRate": float(r.input_rate),
                "outputRate": float(r.output_rate),
                "effectiveFrom": r.effective_from.isoformat(),
            }
            for r in rows
        ]
    }


class PricingCreate(BaseModel):
    model: str = Field(min_length=1, max_length=100)
    provider: str = Field(min_length=1, max_length=20)
    inputRate: float = Field(gt=0)
    outputRate: float = Field(gt=0)
    effectiveFrom: datetime | None = None


@router.post("/pricing", status_code=201)
async def add_pricing(
    body: PricingCreate,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    _require_admin(current_web_analyst)
    row = LLMPricing(
        model=body.model,
        provider=body.provider,
        input_rate=body.inputRate,
        output_rate=body.outputRate,
        effective_from=body.effectiveFrom or datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": str(row.id),
        "model": row.model,
        "provider": row.provider,
        "inputRate": float(row.input_rate),
        "outputRate": float(row.output_rate),
        "effectiveFrom": row.effective_from.isoformat(),
    }
