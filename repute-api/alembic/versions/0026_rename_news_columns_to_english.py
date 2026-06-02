"""rename news table and column names to English

Revision ID: 0026
Revises: 0025
Create Date: 2026-06-02
"""
from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── news_regole → news_rules ──────────────────────────────────────────────
    op.rename_table("news_regole", "news_rules")
    op.execute("ALTER INDEX ix_news_regole_created_by_id RENAME TO ix_news_rules_created_by_id")

    # ── news_sources ──────────────────────────────────────────────────────────
    op.alter_column("news_sources", "nome",        new_column_name="name")
    op.alter_column("news_sources", "tipo",        new_column_name="type")
    op.alter_column("news_sources", "stato",       new_column_name="state")
    op.alter_column("news_sources", "categoria",   new_column_name="category")
    op.alter_column("news_sources", "filtro_citta",new_column_name="city_filter")

    # ── news_agents ───────────────────────────────────────────────────────────
    op.alter_column("news_agents", "nome",            new_column_name="name")
    op.alter_column("news_agents", "categoria_target",new_column_name="target_category")
    op.alter_column("news_agents", "modello",         new_column_name="model")
    op.alter_column("news_agents", "temperatura",     new_column_name="temperature")

    # ── news_published ────────────────────────────────────────────────────────
    op.alter_column("news_published", "titolo",             new_column_name="title")
    op.alter_column("news_published", "fonte_originale",    new_column_name="source_name")
    op.alter_column("news_published", "data_pubblicazione", new_column_name="published_at")
    op.alter_column("news_published", "categoria",          new_column_name="category")
    op.alter_column("news_published", "parole",             new_column_name="word_count")

    # ── news_rules (was news_regole) ──────────────────────────────────────────
    op.alter_column("news_rules", "autopilota",                  new_column_name="autopilot")
    op.alter_column("news_rules", "modalita_urgente",            new_column_name="urgent_mode")
    op.alter_column("news_rules", "frequenza_rss",               new_column_name="rss_frequency")
    op.alter_column("news_rules", "rotazione_fonti",             new_column_name="source_rotation")
    op.alter_column("news_rules", "richiede_approvazione_manuale", new_column_name="requires_manual_approval")
    op.alter_column("news_rules", "filtro_parole_sensibili",     new_column_name="sensitive_word_filter")


def downgrade() -> None:
    op.alter_column("news_rules", "sensitive_word_filter",      new_column_name="filtro_parole_sensibili")
    op.alter_column("news_rules", "requires_manual_approval",   new_column_name="richiede_approvazione_manuale")
    op.alter_column("news_rules", "source_rotation",            new_column_name="rotazione_fonti")
    op.alter_column("news_rules", "rss_frequency",              new_column_name="frequenza_rss")
    op.alter_column("news_rules", "urgent_mode",                new_column_name="modalita_urgente")
    op.alter_column("news_rules", "autopilot",                  new_column_name="autopilota")

    op.alter_column("news_published", "word_count",   new_column_name="parole")
    op.alter_column("news_published", "category",     new_column_name="categoria")
    op.alter_column("news_published", "published_at", new_column_name="data_pubblicazione")
    op.alter_column("news_published", "source_name",  new_column_name="fonte_originale")
    op.alter_column("news_published", "title",        new_column_name="titolo")

    op.alter_column("news_agents", "temperature",     new_column_name="temperatura")
    op.alter_column("news_agents", "model",           new_column_name="modello")
    op.alter_column("news_agents", "target_category", new_column_name="categoria_target")
    op.alter_column("news_agents", "name",            new_column_name="nome")

    op.alter_column("news_sources", "city_filter",new_column_name="filtro_citta")
    op.alter_column("news_sources", "category",   new_column_name="categoria")
    op.alter_column("news_sources", "state",      new_column_name="stato")
    op.alter_column("news_sources", "type",       new_column_name="tipo")
    op.alter_column("news_sources", "name",       new_column_name="nome")

    op.execute("ALTER INDEX ix_news_rules_created_by_id RENAME TO ix_news_regole_created_by_id")
    op.rename_table("news_rules", "news_regole")
