import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.reputation import ReputationScan
from app.models.user import User, UserProfile
from app.schemas.reputation import ReputationScanOut, ReputationScanUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/reputation", tags=["reputation"])


@router.post("/scan", response_model=ReputationScanOut, status_code=201)
async def trigger_scan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new reputation scan record. Results are populated client-side via Claude web search."""
    scan = ReputationScan(
        user_id=current_user.id,
        score=100,
        risk_level="low",
        results=[],
        summary={"total_results": 0, "high_risk": 0, "medium_risk": 0, "low_risk": 0},
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)
    return ReputationScanOut.model_validate(scan)


@router.patch("/scan/{scan_id}", response_model=ReputationScanOut)
async def update_scan(
    scan_id: uuid.UUID,
    payload: ReputationScanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Persist client-computed scan results back to the DB record."""
    result = await db.execute(
        select(ReputationScan).where(ReputationScan.id == scan_id)
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    if scan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your scan.")

    scan.score = payload.score
    scan.risk_level = payload.risk_level
    scan.results = [r.model_dump() for r in payload.results]
    scan.summary = payload.summary
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
