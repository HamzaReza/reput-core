import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.models.lead import Employee, LeadGenerated
from app.utils.auth import get_current_employee

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    name: str | None = None
    company: str | None = None
    country: str | None = None
    background: str | None = None
    pre_analysis_summary: str | None = None
    keywords_suggested: list[str] = []


class LeadUpdate(BaseModel):
    links: list | None = None
    summary: dict | None = None
    score: int | None = None
    keywords_suggested: list[str] | None = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
) -> dict:
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
        existing.scanned_by_id = current_employee.id
        existing.company = payload.company
        existing.background = payload.background
        existing.pre_analysis_summary = payload.pre_analysis_summary
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
        scanned_by_id=current_employee.id,
        name=payload.name,
        company=payload.company,
        country=payload.country,
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
    current_employee: Employee = Depends(get_current_employee),
) -> dict:
    result = await db.execute(
        select(LeadGenerated).where(LeadGenerated.id == lead_id)
    )
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

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
    current_employee: Employee = Depends(get_current_employee),
) -> dict:
    result = await db.execute(
        select(LeadGenerated, Employee.name.label("emp_name"), Employee.email.label("emp_email"))
        .outerjoin(Employee, LeadGenerated.scanned_by_id == Employee.id)
        .where(LeadGenerated.id == lead_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
    lead, emp_name, emp_email = row
    return {
        "id": str(lead.id),
        "name": lead.name,
        "company": lead.company,
        "country": lead.country,
        "background": lead.background,
        "pre_analysis_summary": lead.pre_analysis_summary,
        "keywords_suggested": lead.keywords_suggested or [],
        "links": lead.links or [],
        "summary": lead.summary,
        "score": lead.score,
        "scanned_by_name": emp_name or lead.scanned_by_name,
        "scanned_by_email": emp_email or lead.scanned_by_email,
        "researched_at": lead.researched_at.isoformat() if lead.researched_at else None,
        "scanned_at": lead.scanned_at.isoformat() if lead.scanned_at else None,
    }


@router.get("/")
async def list_leads(
    limit: int = Query(default=5, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
) -> list[dict]:
    result = await db.execute(
        select(LeadGenerated, Employee.name.label("emp_name"), Employee.email.label("emp_email"))
        .outerjoin(Employee, LeadGenerated.scanned_by_id == Employee.id)
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
            "scanned_by_name": emp_name or lead.scanned_by_name,
            "scanned_by_email": emp_email or lead.scanned_by_email,
            "researched_at": lead.researched_at.isoformat() if lead.researched_at else None,
            "scanned_at": lead.scanned_at.isoformat() if lead.scanned_at else None,
        }
        for lead, emp_name, emp_email in rows
    ]
