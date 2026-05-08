from fastapi import APIRouter, Depends
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

    web_analysts = await count("SELECT COUNT(*)::int FROM web_analysts")
    scans = await count("SELECT COUNT(*)::int FROM reputation_scans")
    leads = await count("SELECT COUNT(*)::int FROM lead_generated")
    contracts = await count("SELECT COUNT(*)::int FROM contracts")
    clients = await count("SELECT COUNT(*)::int FROM clients")

    return {"web_analysts": web_analysts, "scans": scans, "leads": leads, "contracts": contracts, "clients": clients}


@router.get("/charts")
async def get_charts(
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    def to_rows(result) -> list[dict]:
        return [{"month": str(r[0])[:10], "count": r[1]} for r in result.fetchall()]

    async def monthly(sql: str) -> list[dict]:
        try:
            result = await db.execute(text(sql))
            return to_rows(result)
        except Exception:
            return []

    web_analysts_data = await monthly("""
        SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
        FROM web_analysts
        WHERE created_at >= DATE_TRUNC('year', NOW())
        GROUP BY 1 ORDER BY 1
    """)
    scans_data = await monthly("""
        SELECT DATE_TRUNC('month', researched_at)::text AS month, COUNT(*)::int AS count
        FROM lead_generated
        WHERE researched_at >= DATE_TRUNC('year', NOW())
        GROUP BY 1 ORDER BY 1
    """)
    contracts_data = await monthly("""
        SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
        FROM contracts
        WHERE created_at >= DATE_TRUNC('year', NOW())
        GROUP BY 1 ORDER BY 1
    """)

    clients_data = await monthly("""
        SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
        FROM clients
        WHERE created_at >= DATE_TRUNC('year', NOW())
        GROUP BY 1 ORDER BY 1
    """)

    return {"web_analysts": web_analysts_data, "leads": scans_data, "contracts": contracts_data, "clients": clients_data}
