import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserProfileBase(BaseModel):
    avatar_url: str | None = None
    linkedin_url: str | None = None
    bio: str | None = None
    company: str | None = None
    job_title: str | None = None
    keywords: list[str] = Field(default_factory=list)
    notification_email: bool = True
    notification_sms: bool = False


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileOut(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


ScanDepthLiteral = Literal["Standard", "Deep", "Thorough"]


class UserBase(BaseModel):
    email: EmailStr
    name: str | None = None
    phone: str | None = None
    nationality: str | None = None
    date_of_birth: date | None = None
    scan_depth: ScanDepthLiteral = "Standard"


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    nationality: str | None = None
    date_of_birth: date | None = None
    scan_depth: ScanDepthLiteral | None = None
    profile_complete: bool | None = None


class UserOut(UserBase):
    id: uuid.UUID
    is_active: bool
    is_verified: bool
    profile_complete: bool
    plan: str = "free"
    pro_trial_expires_at: datetime | None = None
    created_at: datetime
    profile: UserProfileOut | None = None

    model_config = {"from_attributes": True}


class UserWithToken(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"
