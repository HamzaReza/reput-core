"""add news cms tables

Revision ID: 0025
Revises: 0024
Create Date: 2026-06-01
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "news_sources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="RSS"),
        sa.Column("stato", sa.String(20), nullable=False, server_default="attivo"),
        sa.Column("categoria", sa.String(100), nullable=True),
        sa.Column("filtro_citta", sa.String(100), nullable=True),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_sources_created_by_id", "news_sources", ["created_by_id"])

    op.create_table(
        "news_agents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("categoria_target", sa.String(100), nullable=False),
        sa.Column("modello", sa.String(50), nullable=False, server_default="Claude Haiku"),
        sa.Column("temperatura", sa.Float, nullable=False, server_default="0.7"),
        sa.Column("prompt", sa.Text, nullable=False),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_agents_created_by_id", "news_agents", ["created_by_id"])

    op.create_table(
        "news_drafts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("original_source", sa.String(255), nullable=False),
        sa.Column("original_url", sa.Text, nullable=False),
        sa.Column("original_title", sa.Text, nullable=False),
        sa.Column("original_excerpt", sa.Text, nullable=False, server_default=""),
        sa.Column("original_published_at", sa.String(100), nullable=False, server_default=""),
        sa.Column("generated_kicker", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_title", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_subtitle", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_body_preview", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_body", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_seo_title", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_meta_description", sa.Text, nullable=False, server_default=""),
        sa.Column("generated_slug", sa.String(100), nullable=False, server_default=""),
        sa.Column("generated_tags", JSONB, nullable=False, server_default="[]"),
        sa.Column("generated_category", sa.String(100), nullable=False, server_default=""),
        sa.Column("generated_city", sa.String(100), nullable=False, server_default=""),
        sa.Column("cover_image_url", sa.Text, nullable=False, server_default=""),
        sa.Column("cover_image_status", sa.String(50), nullable=False, server_default="Not selected"),
        sa.Column("cover_image_source", sa.String(50), nullable=False, server_default="Unsplash"),
        sa.Column("cover_image_license", sa.String(100), nullable=False, server_default=""),
        sa.Column("cover_image_attribution", sa.String(255), nullable=False, server_default=""),
        sa.Column("image_search_query", sa.String(255), nullable=False, server_default=""),
        sa.Column("image_alt_text", sa.String(255), nullable=False, server_default=""),
        sa.Column("image_caption", sa.String(255), nullable=False, server_default=""),
        sa.Column("alternative_images", JSONB, nullable=False, server_default="[]"),
        sa.Column("priority_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("priority_reasons", JSONB, nullable=False, server_default="[]"),
        sa.Column("status", sa.String(30), nullable=False, server_default="AI Draft"),
        sa.Column("is_breaking", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_drafts_status", "news_drafts", ["status"])
    op.create_index("ix_news_drafts_created_at", "news_drafts", ["created_at"])
    op.create_index("ix_news_drafts_created_by_id", "news_drafts", ["created_by_id"])

    op.create_table(
        "news_published",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("titolo", sa.Text, nullable=False),
        sa.Column("fonte_originale", sa.String(255), nullable=False),
        sa.Column("data_pubblicazione", sa.String(100), nullable=False),
        sa.Column("categoria", sa.String(100), nullable=False),
        sa.Column("parole", sa.Integer, nullable=False, server_default="0"),
        sa.Column("original_url", sa.Text, nullable=False),
        sa.Column("draft_id", UUID(as_uuid=True), sa.ForeignKey("news_drafts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_published_draft_id", "news_published", ["draft_id"])
    op.create_index("ix_news_published_created_by_id", "news_published", ["created_by_id"])
    op.create_index("ix_news_published_created_at", "news_published", ["created_at"])

    op.create_table(
        "news_regole",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("autopilota", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("modalita_urgente", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("frequenza_rss", sa.String(50), nullable=False, server_default="Ogni 15 minuti"),
        sa.Column("rotazione_fonti", sa.Integer, nullable=False, server_default="3"),
        sa.Column("smart_tags", sa.Text, nullable=False, server_default=""),
        sa.Column("richiede_approvazione_manuale", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("filtro_parole_sensibili", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_regole_created_by_id", "news_regole", ["created_by_id"])

    op.create_table(
        "news_wp_config",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("site_url", sa.Text, nullable=False, server_default=""),
        sa.Column("username", sa.String(255), nullable=False, server_default=""),
        sa.Column("app_password", sa.Text, nullable=False, server_default=""),
        sa.Column("default_category", sa.String(100), nullable=False, server_default="News"),
        sa.Column("default_status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("web_analysts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_wp_config_created_by_id", "news_wp_config", ["created_by_id"])


def downgrade() -> None:
    op.drop_table("news_wp_config")
    op.drop_table("news_regole")
    op.drop_table("news_published")
    op.drop_table("news_drafts")
    op.drop_table("news_agents")
    op.drop_table("news_sources")
