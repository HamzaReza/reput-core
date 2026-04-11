from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.user import UserOut, UserUpdate, UserProfileOut, UserProfileUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    return UserOut.model_validate(result.scalar_one())


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(current_user, key, value)
    db.add(current_user)
    await db.flush()

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    return UserOut.model_validate(result.scalar_one())


@router.get("/me/profile", response_model=UserProfileOut)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return UserProfileOut.model_validate(profile)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.delete(current_user)
    await db.flush()


@router.post("/me/start-trial", response_model=UserOut)
async def start_trial(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant the user a 24-hour Pro trial."""
    now = datetime.now(timezone.utc)

    # If a previous trial has expired, reset so the user can purchase again
    if (
        current_user.pro_trial_expires_at is not None
        and current_user.pro_trial_expires_at < now
    ):
        current_user.plan = "free"
        current_user.pro_trial_expires_at = None
        db.add(current_user)
        await db.flush()

    # Block if trial is still active
    if current_user.pro_trial_expires_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pro trial has already been used.",
        )

    current_user.plan = "pro"
    current_user.pro_trial_expires_at = now + timedelta(hours=24)
    db.add(current_user)
    await db.flush()

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    return UserOut.model_validate(result.scalar_one())


@router.put("/me/profile", response_model=UserProfileOut)
async def upsert_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(profile, key, value)

    await db.flush()
    await db.refresh(profile)
    return UserProfileOut.model_validate(profile)
