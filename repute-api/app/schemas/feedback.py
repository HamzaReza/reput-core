import uuid
from datetime import datetime

from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    message: str


class FeedbackOut(BaseModel):
    id: uuid.UUID
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
