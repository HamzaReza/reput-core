import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ContractLink(BaseModel):
    url: str
    title: str


class ContractCreate(BaseModel):
    links: list[ContractLink]
    notes: str | None = None


class ContractOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    links: list[dict]
    notes: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
