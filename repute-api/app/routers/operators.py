from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_db
from app.models.lead import Operator
from app.utils.auth import hash_password, get_current_operator

router = APIRouter(prefix="/operators", tags=["operators"])


class OperatorCreate(BaseModel):
    name: str
    email: str
    password: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_operator(
    payload: OperatorCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    email = payload.email.lower()
    existing = await db.execute(
        select(Operator).where(Operator.email == email).limit(1)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    op = Operator(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(op)
    await db.flush()
    await db.refresh(op)
    return {"id": str(op.id)}


@router.get("/me")
async def get_me(
    current_operator: Operator = Depends(get_current_operator),
) -> dict:
    return {
        "id": str(current_operator.id),
        "name": current_operator.name,
        "email": current_operator.email,
    }


@router.patch("/me")
async def update_me(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_operator: Operator = Depends(get_current_operator),
) -> dict:
    if "name" in payload and payload["name"]:
        current_operator.name = payload["name"]
        db.add(current_operator)
        await db.flush()
    return {"ok": True}


@router.get("/")
async def list_operators(
    db: AsyncSession = Depends(get_db),
    current_operator: Operator = Depends(get_current_operator),
) -> list[dict]:
    result = await db.execute(
        select(Operator).order_by(desc(Operator.created_at))
    )
    operators = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "name": o.name,
            "email": o.email,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in operators
    ]
