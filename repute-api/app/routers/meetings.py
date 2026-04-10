from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.meeting import Meeting
from app.models.user import User
from app.schemas.meeting import CalWebhookPayload, MeetingOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _parse_dt(value: str | None) -> datetime:
    if not value:
        raise ValueError("Missing datetime value")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.post("/webhook", status_code=200)
async def cal_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receives cal.com webhook events and persists/updates meetings in the DB.

    Expected cal.com events:
      - BOOKING_CREATED
      - BOOKING_RESCHEDULED
      - BOOKING_CANCELLED

    The attendee whose email matches an existing user is linked via user_id.
    Configure this URL in the cal.com dashboard under Webhooks.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    payload = CalWebhookPayload(**body)
    booking = payload.payload

    trigger = payload.triggerEvent
    uid: str = booking.get("uid", "")
    if not uid:
        raise HTTPException(status_code=400, detail="Missing booking uid")

    # ── Cancellation / rescheduled-cancel: mark existing record ──────────────
    if trigger == "BOOKING_CANCELLED":
        result = await db.execute(
            select(Meeting).where(Meeting.cal_booking_uid == uid)
        )
        meeting = result.scalar_one_or_none()
        if meeting:
            meeting.status = "cancelled"
        return {"ok": True}

    # ── Created / rescheduled: upsert ────────────────────────────────────────
    try:
        start_time = _parse_dt(booking.get("startTime"))
        end_time = _parse_dt(booking.get("endTime"))
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid datetime: {exc}")

    title: str = booking.get("title") or booking.get("eventTitle") or "Meeting"
    event_type: str | None = (
        (booking.get("eventType") or {}).get("slug")
        or booking.get("eventTypeSlug")
        or None
    )
    raw_attendees: list[dict] = booking.get("attendees") or []
    attendees = [
        {"name": a.get("name", ""), "email": a.get("email", "")}
        for a in raw_attendees
    ]

    # Resolve user from attendee email
    user_id = None
    for attendee in raw_attendees:
        email = attendee.get("email", "")
        if email:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user:
                user_id = user.id
                break

    if user_id is None:
        # No matching user — ignore the booking silently
        return {"ok": True, "skipped": "no matching user"}

    # Determine status based on start time
    now = datetime.now(timezone.utc)
    status = "upcoming" if start_time > now else "completed"
    if trigger == "BOOKING_RESCHEDULED":
        # Delete old booking uid if rescheduled (cal.com sends new uid)
        old_uid: str = booking.get("rescheduleUid", "")
        if old_uid:
            old_result = await db.execute(
                select(Meeting).where(Meeting.cal_booking_uid == old_uid)
            )
            old_meeting = old_result.scalar_one_or_none()
            if old_meeting:
                await db.delete(old_meeting)

    # Check if meeting already exists (idempotency)
    existing_result = await db.execute(
        select(Meeting).where(Meeting.cal_booking_uid == uid)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.title = title
        existing.event_type = event_type
        existing.start_time = start_time
        existing.end_time = end_time
        existing.attendees = attendees
        existing.status = status
        existing.metadata_ = booking
    else:
        meeting = Meeting(
            user_id=user_id,
            cal_booking_uid=uid,
            title=title,
            event_type=event_type,
            status=status,
            start_time=start_time,
            end_time=end_time,
            attendees=attendees,
            metadata_=booking,
        )
        db.add(meeting)

    return {"ok": True}


@router.get("/my", response_model=list[MeetingOut])
async def get_my_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all meetings (past, present, future) for the authenticated user."""
    result = await db.execute(
        select(Meeting)
        .where(Meeting.user_id == current_user.id)
        .order_by(desc(Meeting.start_time))
    )
    meetings = result.scalars().all()
    return [MeetingOut.model_validate(m) for m in meetings]
