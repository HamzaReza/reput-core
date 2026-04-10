import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MeetingAttendee(BaseModel):
    name: str
    email: str


class MeetingOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    cal_booking_uid: str
    title: str
    status: str
    start_time: datetime
    end_time: datetime
    event_type: str | None
    attendees: list[MeetingAttendee]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CalWebhookPayload(BaseModel):
    """Subset of cal.com webhook payload we care about."""
    triggerEvent: str  # BOOKING_CREATED / BOOKING_CANCELLED / BOOKING_RESCHEDULED
    payload: dict
