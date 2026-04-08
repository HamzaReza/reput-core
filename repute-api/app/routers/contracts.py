from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.contract import Contract
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.post("", response_model=ContractOut, status_code=201)
async def create_contract(
    payload: ContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = Contract(
        user_id=current_user.id,
        links=[link.model_dump() for link in payload.links],
        notes=payload.notes,
    )
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    return ContractOut.model_validate(contract)


@router.get("/my", response_model=list[ContractOut])
async def get_my_contracts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == current_user.id)
        .order_by(desc(Contract.created_at))
    )
    contracts = result.scalars().all()
    return [ContractOut.model_validate(c) for c in contracts]
