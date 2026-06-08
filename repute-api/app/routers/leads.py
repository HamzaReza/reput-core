import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.models.client import Client
from app.models.lead import WebAnalyst, LeadGenerated
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    name: str | None = None
    middle_name: str | None = None
    company: str | None = None
    country: str | None = None
    countries: list[str] = []
    background: str | None = None
    pre_analysis_summary: str | None = None
    keywords_suggested: list[str] = []
    force_new: bool = False


class LeadUpdate(BaseModel):
    links: list | None = None
    summary: dict | None = None
    score: int | None = None
    keywords_suggested: list[str] | None = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    existing = None
    if not payload.force_new and payload.name and payload.country:
        result = await db.execute(
            select(LeadGenerated).where(
                LeadGenerated.name == payload.name,
                LeadGenerated.country == payload.country,
            ).limit(1)
        )
        existing = result.scalar_one_or_none()

    if existing is not None:
        existing.scanned_by_id = current_web_analyst.id
        existing.scanned_by_role = current_web_analyst.role
        existing.middle_name = payload.middle_name
        existing.company = payload.company
        existing.background = payload.background
        existing.pre_analysis_summary = payload.pre_analysis_summary
        existing.countries = payload.countries
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
        scanned_by_id=current_web_analyst.id,
        scanned_by_role=current_web_analyst.role,
        name=payload.name,
        middle_name=payload.middle_name,
        company=payload.company,
        country=payload.country,
        countries=payload.countries,
        background=payload.background,
        pre_analysis_summary=payload.pre_analysis_summary,
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
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    result = await db.execute(
        select(LeadGenerated).where(LeadGenerated.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
    if current_web_analyst.role != "admin" and lead.scanned_by_id != current_web_analyst.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if payload.links is not None:
        lead.links = payload.links
        flag_modified(lead, "links")
    if payload.summary is not None:
        lead.summary = payload.summary
        flag_modified(lead, "summary")
    if payload.score is not None:
        lead.score = payload.score
    if payload.keywords_suggested is not None:
        lead.keywords_suggested = payload.keywords_suggested
        flag_modified(lead, "keywords_suggested")
    lead.scanned_at = datetime.now(timezone.utc)
    db.add(lead)
    await db.flush()
    return {"ok": True}


@router.get("/{lead_id}")
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    assigned_to_name_sq = (
        select(Client.assigned_to_name)
        .where(
            Client.name == LeadGenerated.name,
            Client.countries.op("@>")(func.jsonb_build_array(LeadGenerated.country)),
        )
        .limit(1)
        .correlate(LeadGenerated)
        .scalar_subquery()
    )
    query = (
        select(
            LeadGenerated,
            WebAnalyst.name.label("wa_name"),
            WebAnalyst.email.label("wa_email"),
            assigned_to_name_sq.label("assigned_to_name"),
        )
        .outerjoin(WebAnalyst, LeadGenerated.scanned_by_id == WebAnalyst.id)
        .where(LeadGenerated.id == lead_id)
    )
    if current_web_analyst.role != "admin":
        query = query.where(LeadGenerated.scanned_by_id == current_web_analyst.id)
    result = await db.execute(query)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
    lead, wa_name, wa_email, assigned_to_name = row
    return {
        "id": str(lead.id),
        "name": lead.name,
        "middle_name": lead.middle_name,
        "company": lead.company,
        "country": lead.country,
        "background": lead.background,
        "pre_analysis_summary": lead.pre_analysis_summary,
        "keywords_suggested": lead.keywords_suggested or [],
        "links": lead.links or [],
        "summary": lead.summary,
        "score": lead.score,
        "scanned_by_name": wa_name or lead.scanned_by_name,
        "scanned_by_email": wa_email or lead.scanned_by_email,
        "scanned_by_role": lead.scanned_by_role,
        "assigned_to_name": assigned_to_name,
        "researched_at": lead.researched_at.isoformat() if lead.researched_at else None,
        "scanned_at": lead.scanned_at.isoformat() if lead.scanned_at else None,
    }


@router.get("/")
async def list_leads(
    limit: int = Query(default=5, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> list[dict]:
    assigned_to_name_sq = (
        select(Client.assigned_to_name)
        .where(
            Client.name == LeadGenerated.name,
            Client.countries.op("@>")(func.jsonb_build_array(LeadGenerated.country)),
        )
        .limit(1)
        .correlate(LeadGenerated)
        .scalar_subquery()
    )
    query = (
        select(
            LeadGenerated,
            WebAnalyst.name.label("wa_name"),
            WebAnalyst.email.label("wa_email"),
            assigned_to_name_sq.label("assigned_to_name"),
        )
        .outerjoin(WebAnalyst, LeadGenerated.scanned_by_id == WebAnalyst.id)
        .order_by(desc(LeadGenerated.researched_at))
        .limit(limit)
    )
    if current_web_analyst.role != "admin":
        query = query.where(LeadGenerated.scanned_by_id == current_web_analyst.id)
    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "id": str(lead.id),
            "name": lead.name,
            "middle_name": lead.middle_name,
            "company": lead.company,
            "country": lead.country,
            "background": lead.background,
            "score": lead.score,
            "scanned_by_name": wa_name or lead.scanned_by_name,
            "scanned_by_email": wa_email or lead.scanned_by_email,
            "scanned_by_role": lead.scanned_by_role,
            "assigned_to_name": assigned_to_name,
            "researched_at": lead.researched_at.isoformat() if lead.researched_at else None,
            "scanned_at": lead.scanned_at.isoformat() if lead.scanned_at else None,
        }
        for lead, wa_name, wa_email, assigned_to_name in rows
    ]
