import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class QuoteRequestCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    phone: str | None = None
    plan_type: str = Field(pattern="^(starter|pro|enterprise)$")
    message: str | None = None
    details: dict = Field(default_factory=dict)


class QuoteRequestOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    plan_type: str
    message: str | None
    details: dict
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class QuoteRequestUpdate(BaseModel):
    status: str = Field(pattern="^(pending|reviewed|closed)$")
