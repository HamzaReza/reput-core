from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserProfile
from app.models.lead import Employee
from app.schemas.user import UserCreate, UserOut, UserWithToken
from app.utils.auth import create_access_token, hash_password, verify_password, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserWithToken, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        phone=payload.phone,
        nationality=payload.nationality,
        date_of_birth=payload.date_of_birth,
        scan_depth=payload.scan_depth,
    )
    db.add(user)
    await db.flush()

    profile = UserProfile(user_id=user.id)
    db.add(profile)
    await db.flush()

    await db.refresh(user)

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user.id)
    )
    user_with_profile = result.scalar_one()

    token = create_access_token(str(user.id))
    return UserWithToken(user=UserOut.model_validate(user_with_profile), access_token=token)


@router.post("/register-employee", status_code=status.HTTP_201_CREATED)
async def register_employee(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Employee).where(Employee.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this email already exists.",
        )
    emp = Employee(
        name=payload.name or payload.email,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(emp)
    await db.flush()
    await db.refresh(emp)
    return {"id": str(emp.id), "email": emp.email}


@router.post("/login", response_model=UserWithToken)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.email == form.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled.",
        )

    token = create_access_token(str(user.id))
    return UserWithToken(user=UserOut.model_validate(user), access_token=token)


@router.post("/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.is_verified = True
    db.add(current_user)


@router.get("/me", response_model=UserOut)
async def me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return UserOut.model_validate(user)
