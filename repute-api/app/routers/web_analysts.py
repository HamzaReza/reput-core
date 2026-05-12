from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_db
from app.models.lead import WebAnalyst
from app.utils.auth import hash_password, verify_password, get_current_web_analyst

router = APIRouter(prefix="/web-analysts", tags=["web-analysts"])


class WebAnalystCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "analyst"


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_web_analyst(
    payload: WebAnalystCreate,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if current_web_analyst.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    if payload.role not in ("admin", "analyst"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role.")

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
        role=payload.role,
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
        "role": current_web_analyst.role,
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


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


@router.patch("/me/password")
async def change_password(
    payload: ChangePasswordPayload,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if not verify_password(payload.current_password, current_web_analyst.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters.")
    current_web_analyst.password_hash = hash_password(payload.new_password)
    db.add(current_web_analyst)
    await db.flush()
    return {"ok": True}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> None:
    await db.delete(current_web_analyst)


@router.get("/")
async def list_web_analysts(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> list[dict]:
    if current_web_analyst.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    result = await db.execute(
        select(WebAnalyst).order_by(desc(WebAnalyst.created_at))
    )
    web_analysts = result.scalars().all()
    return [
        {
            "id": str(w.id),
            "name": w.name,
            "email": w.email,
            "role": w.role,
            "is_blocked": w.is_blocked,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in web_analysts
    ]


class BlockPayload(BaseModel):
    blocked: bool


@router.delete("/{web_analyst_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_web_analyst(
    web_analyst_id: str,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> None:
    if current_web_analyst.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    result = await db.execute(select(WebAnalyst).where(WebAnalyst.id == web_analyst_id))
    wa = result.scalar_one_or_none()
    if wa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Web analyst not found.")
    if wa.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin accounts cannot be deleted.")
    await db.delete(wa)


@router.patch("/{web_analyst_id}/block")
async def set_blocked(
    web_analyst_id: str,
    payload: BlockPayload,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if current_web_analyst.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    result = await db.execute(select(WebAnalyst).where(WebAnalyst.id == web_analyst_id))
    wa = result.scalar_one_or_none()
    if wa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Web analyst not found.")
    if wa.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin accounts cannot be blocked.")
    wa.is_blocked = payload.blocked
    db.add(wa)
    await db.flush()
    return {"ok": True, "is_blocked": wa.is_blocked}
