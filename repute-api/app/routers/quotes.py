from fastapi import APIRouter, Depends, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.quote import QuoteRequest
from app.models.user import User
from app.schemas.quote import QuoteRequestCreate, QuoteRequestOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.post("", response_model=QuoteRequestOut, status_code=status.HTTP_201_CREATED)
async def create_quote(
    payload: QuoteRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """Submit a quote request. No auth required — guests can submit."""
    quote = QuoteRequest(
        user_id=None,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        plan_type=payload.plan_type,
        message=payload.message,
        details=payload.details,
    )
    db.add(quote)
    await db.flush()
    await db.refresh(quote)
    return QuoteRequestOut.model_validate(quote)


@router.post("/authenticated", response_model=QuoteRequestOut, status_code=status.HTTP_201_CREATED)
async def create_quote_authenticated(
    payload: QuoteRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a quote request as an authenticated user (links to account)."""
    quote = QuoteRequest(
        user_id=current_user.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        plan_type=payload.plan_type,
        message=payload.message,
        details=payload.details,
    )
    db.add(quote)
    await db.flush()
    await db.refresh(quote)
    return QuoteRequestOut.model_validate(quote)


@router.get("/my", response_model=list[QuoteRequestOut])
async def get_my_quotes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(QuoteRequest)
        .where(QuoteRequest.user_id == current_user.id)
        .order_by(desc(QuoteRequest.created_at))
    )
    return [QuoteRequestOut.model_validate(q) for q in result.scalars().all()]
