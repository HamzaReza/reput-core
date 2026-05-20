from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import WebAnalyst
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    async def count(sql: str) -> int:
        try:
            result = await db.execute(text(sql))
            return result.scalar() or 0
        except Exception:
            return 0

    def pct_change(current: int, last: int) -> int | None:
        if last == 0:
            return None if current == 0 else 100
        return round((current - last) / last * 100)

    web_analysts = await count("SELECT COUNT(*)::int FROM web_analysts")
    scans        = await count("SELECT COUNT(*)::int FROM lead_generated WHERE score IS NOT NULL")
    leads        = await count("SELECT COUNT(*)::int FROM lead_generated")
    contracts    = await count("SELECT COUNT(*)::int FROM contracts")
    clients      = await count("SELECT COUNT(*)::int FROM clients")

    try:
        avg_result = await db.execute(text(
            "SELECT ROUND(AVG((data->>'score')::int))::int "
            "FROM client_events WHERE event_type = 'scan' AND data->>'score' IS NOT NULL"
        ))
        avg_score = avg_result.scalar() or 0
    except Exception:
        avg_score = 0

    async def scalar_or_none(sql: str):
        try:
            result = await db.execute(text(sql))
            return result.scalar()
        except Exception:
            return None

    # Month-over-month trends
    trends: dict = {"clients": None, "leads": None, "scans": None, "avg_score": None}
    try:
        row = (await db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE researched_at >= DATE_TRUNC('month', NOW()))::int                                                                   AS leads_cur,
                COUNT(*) FILTER (WHERE researched_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                                   AND researched_at <  DATE_TRUNC('month', NOW()))::int                                                                   AS leads_prev,
                COUNT(*) FILTER (WHERE score IS NOT NULL AND researched_at >= DATE_TRUNC('month', NOW()))::int                                              AS scans_cur,
                COUNT(*) FILTER (WHERE score IS NOT NULL AND researched_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                                                          AND researched_at <  DATE_TRUNC('month', NOW()))::int                                             AS scans_prev
            FROM lead_generated
        """))).one()
        trends["leads"] = pct_change(row.leads_cur or 0, row.leads_prev or 0)
        trends["scans"] = pct_change(row.scans_cur or 0, row.scans_prev or 0)
    except Exception:
        pass

    avg_cur  = await scalar_or_none(
        "SELECT ROUND(AVG((data->>'score')::int))::int FROM client_events "
        "WHERE event_type = 'scan' AND data->>'score' IS NOT NULL "
        "AND created_at >= DATE_TRUNC('month', NOW())"
    )
    avg_prev = await scalar_or_none(
        "SELECT ROUND(AVG((data->>'score')::int))::int FROM client_events "
        "WHERE event_type = 'scan' AND data->>'score' IS NOT NULL "
        "AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' "
        "AND created_at < DATE_TRUNC('month', NOW())"
    )
    trends["avg_score"] = (int(avg_cur) - int(avg_prev)) if (avg_cur is not None and avg_prev is not None) else None

    try:
        c_row = (await db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::int                                                                      AS cur,
                COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                                   AND created_at <  DATE_TRUNC('month', NOW()))::int                                                                      AS prev
            FROM clients
        """))).one()
        trends["clients"] = pct_change(c_row.cur or 0, c_row.prev or 0)
    except Exception:
        pass

    return {
        "web_analysts": web_analysts, "scans": scans, "leads": leads,
        "contracts": contracts, "clients": clients, "avg_score": avg_score,
        "trends": trends,
    }


@router.get("/score-distribution")
async def get_score_distribution(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    sql = """
        SELECT
            COUNT(*) FILTER (WHERE (data->>'score')::int >= 86)                                AS good,
            COUNT(*) FILTER (WHERE (data->>'score')::int >= 61 AND (data->>'score')::int < 86) AS mediocre,
            COUNT(*) FILTER (WHERE (data->>'score')::int >= 26 AND (data->>'score')::int < 61) AS poor,
            COUNT(*) FILTER (WHERE (data->>'score')::int < 26)                                 AS negative,
            COUNT(*)                                                                            AS total,
            ROUND(AVG((data->>'score')::int))::int                                             AS average
        FROM client_events
        WHERE event_type = 'scan'
          AND data->>'score' IS NOT NULL
    """
    try:
        result = await db.execute(text(sql))
        row = result.fetchone()
        total = row.total or 0
        def pct(n): return round((n / total) * 100) if total else 0
        return {
            "distribution": [
                {"name": "Good",     "value": pct(row.good),     "color": "#22c55e"},
                {"name": "Mediocre", "value": pct(row.mediocre), "color": "#4479DA"},
                {"name": "Poor",     "value": pct(row.poor),     "color": "#f97316"},
                {"name": "Negative", "value": pct(row.negative), "color": "#ef4444"},
            ],
            "average": row.average or 0,
            "total": total,
        }
    except Exception:
        return {"distribution": [], "average": 0, "total": 0}


@router.get("/charts")
async def get_charts(
    period: str = Query("monthly", pattern="^(weekly|monthly)$"),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    def to_rows(result) -> list[dict]:
        return [{"month": str(r[0])[:10], "count": r[1]} for r in result.fetchall()]

    async def query(sql: str) -> list[dict]:
        try:
            result = await db.execute(text(sql))
            return to_rows(result)
        except Exception:
            return []

    async def query_leads_split(sql: str) -> tuple[list[dict], list[dict]]:
        try:
            result = await db.execute(text(sql))
            rows = result.fetchall()
            completed = [{"month": str(r[0])[:10], "count": r[1]} for r in rows]
            pending   = [{"month": str(r[0])[:10], "count": r[2]} for r in rows]
            return completed, pending
        except Exception:
            return [], []

    if period == "weekly":
        web_analysts_data = await query("""
            SELECT DATE_TRUNC('day', created_at)::text AS month, COUNT(*)::int AS count
            FROM web_analysts
            WHERE created_at >= DATE_TRUNC('week', NOW())
              AND created_at <  DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
            GROUP BY 1 ORDER BY 1
        """)
        leads_completed, leads_pending = await query_leads_split("""
            SELECT
                DATE_TRUNC('day', researched_at)::text AS month,
                COUNT(*) FILTER (WHERE score IS NOT NULL)::int AS completed,
                COUNT(*) FILTER (WHERE score IS NULL)::int     AS pending
            FROM lead_generated
            WHERE researched_at >= DATE_TRUNC('week', NOW())
              AND researched_at <  DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
            GROUP BY 1 ORDER BY 1
        """)
        contracts_data = await query("""
            SELECT DATE_TRUNC('day', created_at)::text AS month, COUNT(*)::int AS count
            FROM contracts
            WHERE created_at >= DATE_TRUNC('week', NOW())
              AND created_at <  DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
            GROUP BY 1 ORDER BY 1
        """)
        clients_data = await query("""
            SELECT DATE_TRUNC('day', created_at)::text AS month, COUNT(*)::int AS count
            FROM clients
            WHERE created_at >= DATE_TRUNC('week', NOW())
              AND created_at <  DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
            GROUP BY 1 ORDER BY 1
        """)
    else:
        web_analysts_data = await query("""
            SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
            FROM web_analysts
            WHERE created_at >= DATE_TRUNC('year', NOW())
            GROUP BY 1 ORDER BY 1
        """)
        leads_completed, leads_pending = await query_leads_split("""
            SELECT
                DATE_TRUNC('month', researched_at)::text AS month,
                COUNT(*) FILTER (WHERE score IS NOT NULL)::int AS completed,
                COUNT(*) FILTER (WHERE score IS NULL)::int     AS pending
            FROM lead_generated
            WHERE researched_at >= DATE_TRUNC('year', NOW())
            GROUP BY 1 ORDER BY 1
        """)
        contracts_data = await query("""
            SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
            FROM contracts
            WHERE created_at >= DATE_TRUNC('year', NOW())
            GROUP BY 1 ORDER BY 1
        """)
        clients_data = await query("""
            SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
            FROM clients
            WHERE created_at >= DATE_TRUNC('year', NOW())
            GROUP BY 1 ORDER BY 1
        """)

    return {
        "web_analysts": web_analysts_data,
        "leads": leads_completed,
        "leads_pending": leads_pending,
        "contracts": contracts_data,
        "clients": clients_data,
    }


@router.get("/funnel")
async def get_funnel(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    sql = """
        SELECT
            (SELECT COUNT(*)::int FROM lead_generated)                                              AS total_leads,
            COUNT(*)::int                                                                           AS scanned_count,
            COUNT(DISTINCT data->>'lead_id')::int                                                   AS unique_scanned,
            COUNT(*) FILTER (WHERE (data->>'score')::int >= 86)                                    AS good,
            COUNT(*) FILTER (WHERE (data->>'score')::int >= 61 AND (data->>'score')::int < 86)     AS mediocre,
            COUNT(*) FILTER (WHERE (data->>'score')::int >= 26 AND (data->>'score')::int < 61)     AS poor,
            COUNT(*) FILTER (WHERE (data->>'score')::int < 26)                                     AS negative
        FROM client_events
        WHERE event_type = 'scan'
          AND data->>'score' IS NOT NULL
    """
    try:
        result = await db.execute(text(sql))
        row = result.fetchone()
        return {
            "total":          int(row.total_leads),
            "scanned":        int(row.scanned_count),
            "unique_scanned": int(row.unique_scanned),
            "good":           int(row.good),
            "mediocre":       int(row.mediocre),
            "poor":           int(row.poor),
            "negative":       int(row.negative),
        }
    except Exception:
        return {"total": 0, "scanned": 0, "unique_scanned": 0, "good": 0, "mediocre": 0, "poor": 0, "negative": 0}


@router.get("/activity-by-region")
async def get_activity_by_region(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    sql = """
        SELECT country_name, COUNT(*)::int AS scan_count
        FROM client_events,
             jsonb_array_elements_text(data->'countries') AS country_name
        WHERE event_type = 'scan'
          AND data ? 'countries'
          AND jsonb_array_length(data->'countries') > 0
        GROUP BY country_name
        ORDER BY scan_count DESC
    """
    try:
        result = await db.execute(text(sql))
        rows = result.fetchall()
        return {"regions": [{"country": row[0], "count": row[1]} for row in rows]}
    except Exception:
        return {"regions": []}
