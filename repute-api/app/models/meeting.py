import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    cal_booking_uid: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e.g. "15min", "consultation"
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="upcoming", server_default="upcoming"
    )  # upcoming / cancelled / completed
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attendees: Mapped[list] = mapped_column(JSONB, default=list)  # [{name, email}]
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, default=dict
    )  # raw cal.com payload extras
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="meetings")  # type: ignore[name-defined]
