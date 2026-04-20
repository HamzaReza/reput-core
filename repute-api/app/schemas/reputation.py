import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReputationResult(BaseModel):
    source: str
    url: str
    title: str
    snippet: str
    risk: str  # low / medium / high
    type: str  # search / social / news


class ReputationScanOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    score: int = Field(ge=0, le=100)
    risk_level: str
    results: list[ReputationResult] = Field(default_factory=list)
    summary: dict = Field(default_factory=dict)
    scanned_at: datetime

    model_config = {"from_attributes": True}


class ReputationScanCreate(BaseModel):
    """Used internally when triggering a new scan."""
    keywords: list[str] = Field(default_factory=list)
