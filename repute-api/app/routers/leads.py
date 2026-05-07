import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import LeadGenerated
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    name: str | None = None
    company: str | None = None
    country: str | None = None
    background: str | None = None
    keywords_suggested: list[str] = []


class LeadUpdate(BaseModel):
    links: list | None = None
    summary: dict | None = None
    score: int | None = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    # Upsert: if a row with the same name + country exists, refresh it
    existing = None
    if payload.name and payload.country:
        result = await db.execute(
            select(LeadGenerated).where(
                LeadGenerated.name == payload.name,
                LeadGenerated.country == payload.country,
            ).limit(1)
        )
        existing = result.scalar_one_or_none()

    if existing is not None:
        existing.scanned_by_id = current_user.id
        existing.company = payload.company
        existing.background = payload.background
        existing.keywords_suggested = payload.keywords_suggested
        existing.researched_at = datetime.now(timezone.utc)
        existing.links = None
        existing.summary = None
        existing.score = None
        existing.scanned_at = None
        db.add(existing)
        await db.flush()
        return {"id": str(existing.id)}

    lead = LeadGenerated(
        scanned_by_id=current_user.id,
        name=payload.name,
        company=payload.company,
        country=payload.country,
        background=payload.background,
        keywords_suggested=payload.keywords_suggested,
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return {"id": str(lead.id)}


@router.patch("/{lead_id}", status_code=status.HTTP_200_OK)
async def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(LeadGenerated).where(LeadGenerated.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    if payload.links is not None:
        lead.links = payload.links
    if payload.summary is not None:
        lead.summary = payload.summary
    if payload.score is not None:
        lead.score = payload.score
    lead.scanned_at = datetime.now(timezone.utc)
    db.add(lead)
    await db.flush()
    return {"ok": True}


@router.get("/")
async def list_leads(
    limit: int = Query(default=5, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    result = await db.execute(
        select(LeadGenerated, User.name.label("user_name"), User.email.label("user_email"))
        .outerjoin(User, LeadGenerated.scanned_by_id == User.id)
        .order_by(desc(LeadGenerated.researched_at))
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": str(lead.id),
            "name": lead.name,
            "company": lead.company,
            "country": lead.country,
            "background": lead.background,
            "score": lead.score,
            "scanned_by_name": user_name or lead.scanned_by_name,
            "scanned_by_email": user_email or lead.scanned_by_email,
            "researched_at": lead.researched_at.isoformat() if lead.researched_at else None,
            "scanned_at": lead.scanned_at.isoformat() if lead.scanned_at else None,
        }
        for lead, user_name, user_email in rows
    ]
