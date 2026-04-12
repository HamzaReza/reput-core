from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut, status_code=201)
async def submit_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
):
    fb = Feedback(message=payload.message)
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb


@router.get("", response_model=list[FeedbackOut])
async def list_feedbacks(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).order_by(Feedback.created_at.desc())
    )
    return result.scalars().all()
