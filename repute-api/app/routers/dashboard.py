from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    async def count(sql: str) -> int:
        try:
            result = await db.execute(text(sql))
            return result.scalar() or 0
        except Exception:
            return 0

    users = await count("SELECT COUNT(*)::int FROM users")
    scans = await count("SELECT COUNT(*)::int FROM reputation_scans")
    leads = await count("SELECT COUNT(*)::int FROM lead_generated")
    contracts = await count("SELECT COUNT(*)::int FROM contracts")

    return {"users": users, "scans": scans, "leads": leads, "contracts": contracts}


@router.get("/charts")
async def get_charts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    def to_rows(result) -> list[dict]:
        return [{"month": str(r[0])[:10], "count": r[1]} for r in result.fetchall()]

    async def monthly(sql: str) -> list[dict]:
        try:
            result = await db.execute(text(sql))
            return to_rows(result)
        except Exception:
            return []

    users_data = await monthly("""
        SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY 1 ORDER BY 1
    """)
    scans_data = await monthly("""
        SELECT DATE_TRUNC('month', scanned_at)::text AS month, COUNT(*)::int AS count
        FROM reputation_scans
        WHERE scanned_at >= NOW() - INTERVAL '6 months'
        GROUP BY 1 ORDER BY 1
    """)
    contracts_data = await monthly("""
        SELECT DATE_TRUNC('month', created_at)::text AS month, COUNT(*)::int AS count
        FROM contracts
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY 1 ORDER BY 1
    """)

    return {"users": users_data, "scans": scans_data, "contracts": contracts_data}
