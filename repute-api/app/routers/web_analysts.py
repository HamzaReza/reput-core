from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_db
from app.models.lead import WebAnalyst
from app.utils.auth import hash_password, get_current_web_analyst

router = APIRouter(prefix="/web-analysts", tags=["web-analysts"])


class WebAnalystCreate(BaseModel):
    name: str
    email: str
    password: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_web_analyst(
    payload: WebAnalystCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    email = payload.email.lower()
    existing = await db.execute(
        select(WebAnalyst).where(WebAnalyst.email == email).limit(1)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    wa = WebAnalyst(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(wa)
    await db.flush()
    await db.refresh(wa)
    return {"id": str(wa.id)}


@router.get("/me")
async def get_me(
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    return {
        "id": str(current_web_analyst.id),
        "name": current_web_analyst.name,
        "email": current_web_analyst.email,
    }


@router.patch("/me")
async def update_me(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if "name" in payload and payload["name"]:
        current_web_analyst.name = payload["name"]
        db.add(current_web_analyst)
        await db.flush()
    return {"ok": True}


@router.get("/")
async def list_web_analysts(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> list[dict]:
    result = await db.execute(
        select(WebAnalyst).order_by(desc(WebAnalyst.created_at))
    )
    web_analysts = result.scalars().all()
    return [
        {
            "id": str(w.id),
            "name": w.name,
            "email": w.email,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in web_analysts
    ]
