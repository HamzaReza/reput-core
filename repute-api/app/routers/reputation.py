import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.reputation import ReputationScan
from app.models.user import User, UserProfile
from app.schemas.reputation import ReputationScanOut, ReputationResult
from app.utils.auth import get_current_user

router = APIRouter(prefix="/reputation", tags=["reputation"])


def _mock_scan(keywords: list[str]) -> tuple[int, str, list[dict], dict]:
    """
    Placeholder scan engine.  Replace with real scraping / API calls.
    Returns (score, risk_level, results, summary).
    """
    score = random.randint(40, 95)
    risk_level = "low" if score >= 75 else ("medium" if score >= 50 else "high")

    sources = ["Google", "Twitter", "LinkedIn", "Reddit", "Yelp", "TrustPilot"]
    risk_options = ["low", "medium", "high"]

    results = []
    for i in range(random.randint(4, 10)):
        kw = keywords[i % len(keywords)] if keywords else "reputation"
        results.append(
            {
                "source": random.choice(sources),
                "url": f"https://example.com/result-{i+1}",
                "title": f"{kw.title()} mention #{i+1}",
                "snippet": f"This is a placeholder result mentioning '{kw}'.",
                "risk": random.choice(risk_options),
                "type": random.choice(["search", "social", "news"]),
            }
        )

    summary = {
        "total_results": len(results),
        "high_risk": sum(1 for r in results if r["risk"] == "high"),
        "medium_risk": sum(1 for r in results if r["risk"] == "medium"),
        "low_risk": sum(1 for r in results if r["risk"] == "low"),
    }
    return score, risk_level, results, summary


@router.post("/scan", response_model=ReputationScanOut, status_code=201)
async def trigger_scan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a new reputation scan for the authenticated user."""
    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    keywords: list[str] = profile.keywords if profile and profile.keywords else []
    if current_user.name:
        keywords = [current_user.name] + keywords

    score, risk_level, results, summary = _mock_scan(keywords)

    scan = ReputationScan(
        user_id=current_user.id,
        score=score,
        risk_level=risk_level,
        results=results,
        summary=summary,
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)
    return ReputationScanOut.model_validate(scan)


@router.get("/latest", response_model=ReputationScanOut | None)
async def get_latest_scan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReputationScan)
        .where(ReputationScan.user_id == current_user.id)
        .order_by(desc(ReputationScan.scanned_at))
        .limit(1)
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        return None
    return ReputationScanOut.model_validate(scan)


@router.get("/history", response_model=list[ReputationScanOut])
async def get_scan_history(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReputationScan)
        .where(ReputationScan.user_id == current_user.id)
        .order_by(desc(ReputationScan.scanned_at))
        .offset(offset)
        .limit(limit)
    )
    scans = result.scalars().all()
    return [ReputationScanOut.model_validate(s) for s in scans]
