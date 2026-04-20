import uuid
from datetime import datetime

from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    message: str
    email: str | None = None


class FeedbackOut(BaseModel):
    id: uuid.UUID
    email: str | None
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
