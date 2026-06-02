import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NewsSource(Base):
    __tablename__ = "news_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="RSS", server_default="RSS")
    state: Mapped[str] = mapped_column(String(20), nullable=False, default="active", server_default="active")
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city_filter: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NewsAgent(Base):
    __tablename__ = "news_agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_category: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False, default="Claude Haiku", server_default="Claude Haiku")
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="English", server_default="English")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NewsDraft(Base):
    __tablename__ = "news_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_source: Mapped[str] = mapped_column(String(255), nullable=False)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    original_title: Mapped[str] = mapped_column(Text, nullable=False)
    original_excerpt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    original_published_at: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    generated_kicker: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_subtitle: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_body_preview: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_seo_title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_meta_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_slug: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    generated_tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    generated_category: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    generated_city: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    cover_image_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_image_status: Mapped[str] = mapped_column(String(50), nullable=False, default="Not selected")
    cover_image_source: Mapped[str] = mapped_column(String(50), nullable=False, default="Unsplash")
    cover_image_license: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    cover_image_attribution: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    image_search_query: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    image_alt_text: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    image_caption: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    alternative_images: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    priority_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority_reasons: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="AI Draft", server_default="AI Draft", index=True)
    is_breaking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NewsPublished(Base):
    __tablename__ = "news_published"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    published_at: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    draft_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("news_drafts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class NewsRules(Base):
    __tablename__ = "news_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    autopilot: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    urgent_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    rss_frequency: Mapped[str] = mapped_column(String(50), nullable=False, default="Every 15 minutes")
    source_rotation: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    smart_tags: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requires_manual_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    sensitive_word_filter: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NewsWPConfig(Base):
    __tablename__ = "news_wp_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    username: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    app_password: Mapped[str] = mapped_column(Text, nullable=False, default="")
    default_category: Mapped[str] = mapped_column(String(100), nullable=False, default="News")
    default_status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", server_default="draft")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
