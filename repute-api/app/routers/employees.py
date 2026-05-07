from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.database import get_db
from app.models.lead import Employee
from app.utils.auth import hash_password, get_current_employee

router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeCreate(BaseModel):
    name: str
    email: str
    password: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    existing = await db.execute(
        select(Employee).where(Employee.email == payload.email).limit(1)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    emp = Employee(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(emp)
    await db.flush()
    await db.refresh(emp)
    return {"id": str(emp.id)}


@router.get("/me")
async def get_me(
    current_employee: Employee = Depends(get_current_employee),
) -> dict:
    return {
        "id": str(current_employee.id),
        "name": current_employee.name,
        "email": current_employee.email,
    }


@router.patch("/me")
async def update_me(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
) -> dict:
    if "name" in payload and payload["name"]:
        current_employee.name = payload["name"]
        db.add(current_employee)
        await db.flush()
    return {"ok": True}


@router.get("/")
async def list_employees(
    db: AsyncSession = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
) -> list[dict]:
    result = await db.execute(
        select(Employee).order_by(desc(Employee.created_at))
    )
    employees = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "name": e.name,
            "email": e.email,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in employees
    ]
