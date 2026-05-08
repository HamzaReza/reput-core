import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import delete as sql_delete, desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.client import Client, ClientEvent
from app.models.lead import LeadGenerated, WebAnalyst
from app.utils.auth import get_current_web_analyst

router = APIRouter(prefix="/clients", tags=["clients"])

VALID_EVENT_TYPES = {"research", "scan", "quote_sent", "quote_accepted", "quote_rejected", "contract_created", "meeting_set"}


class ClientUpsertPayload(BaseModel):
    name: str
    country: str
    company: str | None = None
    event_type: str | None = None
    event_data: dict | None = None


class ClientAddEventPayload(BaseModel):
    event_type: str
    event_data: dict | None = None


@router.post("/upsert", status_code=status.HTTP_200_OK)
async def upsert_client(
    payload: ClientUpsertPayload,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if payload.event_type and payload.event_type not in VALID_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event_type: {payload.event_type}")

    result = await db.execute(
        select(Client).where(
            Client.name == payload.name,
            Client.country == payload.country,
        ).limit(1)
    )
    client = result.scalar_one_or_none()
    created = False

    if client is None:
        client = Client(
            name=payload.name,
            country=payload.country,
            company=payload.company,
            created_by_id=current_web_analyst.id,
        )
        db.add(client)
        created = True
    else:
        if payload.company is not None:
            client.company = payload.company
        client.updated_at = datetime.now(timezone.utc)
        db.add(client)

    await db.flush()

    if payload.event_type:
        event = ClientEvent(
            client_id=client.id,
            event_type=payload.event_type,
            data=payload.event_data,
            created_by_id=current_web_analyst.id,
        )
        db.add(event)
        client.updated_at = datetime.now(timezone.utc)
        db.add(client)
        await db.flush()

    return {"id": str(client.id), "created": created}


@router.post("/{client_id}/events", status_code=status.HTTP_201_CREATED)
async def add_event(
    client_id: uuid.UUID,
    payload: ClientAddEventPayload,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if payload.event_type not in VALID_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event_type: {payload.event_type}")

    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    event = ClientEvent(
        client_id=client.id,
        event_type=payload.event_type,
        data=payload.event_data,
        created_by_id=current_web_analyst.id,
    )
    db.add(event)
    client.updated_at = datetime.now(timezone.utc)
    db.add(client)
    await db.flush()
    await db.refresh(event)

    return {"event_id": str(event.id)}


@router.get("/")
async def list_clients(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> list[dict]:
    rows = await db.execute(text("""
        SELECT
            c.id, c.name, c.country, c.company,
            c.created_at, c.updated_at,
            ce.event_type  AS latest_event_type,
            ce.created_at  AS latest_event_at,
            ce.data        AS latest_event_data
        FROM clients c
        LEFT JOIN LATERAL (
            SELECT event_type, created_at, data
            FROM client_events
            WHERE client_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
        ) ce ON true
        ORDER BY c.updated_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})

    out = []
    for row in rows.mappings():
        latest_data = row["latest_event_data"] or {}
        latest_score = latest_data.get("score") if row["latest_event_type"] == "scan" else None
        out.append({
            "id": str(row["id"]),
            "name": row["name"],
            "country": row["country"],
            "company": row["company"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "latest_event_type": row["latest_event_type"],
            "latest_event_at": row["latest_event_at"].isoformat() if row["latest_event_at"] else None,
            "latest_score": latest_score,
        })
    return out


@router.get("/{client_id}")
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    client = client_result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    events_result = await db.execute(
        select(ClientEvent)
        .where(ClientEvent.client_id == client_id)
        .order_by(ClientEvent.created_at)
    )
    events = events_result.scalars().all()

    return {
        "id": str(client.id),
        "name": client.name,
        "country": client.country,
        "company": client.company,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "updated_at": client.updated_at.isoformat() if client.updated_at else None,
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "data": e.data,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }


@router.delete("/{client_id}", status_code=status.HTTP_200_OK)
async def delete_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    client = client_result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    # Collect lead_ids from event_data before cascade deletes them
    events_result = await db.execute(
        select(ClientEvent).where(ClientEvent.client_id == client_id)
    )
    events = events_result.scalars().all()
    lead_ids: list[uuid.UUID] = []
    for event in events:
        if event.data and isinstance(event.data, dict):
            raw_id = event.data.get("lead_id")
            if raw_id:
                try:
                    lead_ids.append(uuid.UUID(str(raw_id)))
                except ValueError:
                    pass

    # Delete client (cascades client_events automatically)
    await db.delete(client)
    await db.flush()

    # Delete orphaned lead records
    if lead_ids:
        await db.execute(
            sql_delete(LeadGenerated).where(LeadGenerated.id.in_(lead_ids))
        )

    return {"ok": True}
