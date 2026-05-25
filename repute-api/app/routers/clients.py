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
    email: str | None = None
    phone: str | None = None
    event_type: str | None = None
    event_data: dict | None = None


class ClientAddEventPayload(BaseModel):
    event_type: str
    event_data: dict | None = None


class ClientAssignPayload(BaseModel):
    analyst_id: str | None = None


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
            email=payload.email,
            phone=payload.phone,
            created_by_id=current_web_analyst.id,
        )
        db.add(client)
        created = True
    else:
        if payload.company is not None:
            client.company = payload.company
        if payload.email is not None:
            client.email = payload.email
        if payload.phone is not None:
            client.phone = payload.phone
        client.updated_at = datetime.now(timezone.utc)
        db.add(client)

    await db.flush()

    # Block unauthorized users from research or scan events.
    if payload.event_type in ("research", "scan") and client.scanned_by_id is not None:
        allowed = (
            current_web_analyst.role == "admin"
            or client.scanned_by_id == current_web_analyst.id
            or client.assigned_to_id == current_web_analyst.id
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"This client has already been scanned by "
                    f"{client.scanned_by_name or 'another analyst'} "
                    f"and cannot be scanned again by a different user."
                ),
            )

    # On the first research event, lock the client to this scanner.
    if payload.event_type == "research":
        if client.scanned_by_id is None:
            client.scanned_by_id = current_web_analyst.id
            client.scanned_by_name = current_web_analyst.name
            client.scanned_by_role = current_web_analyst.role
            db.add(client)
            await db.flush()

    # Auto-assign analyst to any client they interact with if not already assigned
    if (
        payload.event_type
        and current_web_analyst.role == "analyst"
        and client.assigned_to_id is None
    ):
        client.assigned_to_id = current_web_analyst.id
        client.assigned_to_name = current_web_analyst.name
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

    # Auto-assign analyst to any client they interact with if not already assigned
    if current_web_analyst.role == "analyst" and client.assigned_to_id is None:
        client.assigned_to_id = current_web_analyst.id
        client.assigned_to_name = current_web_analyst.name

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


@router.patch("/{client_id}/assign", status_code=status.HTTP_200_OK)
async def assign_client(
    client_id: uuid.UUID,
    payload: ClientAssignPayload,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    if current_web_analyst.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    client_result = await db.execute(select(Client).where(Client.id == client_id))
    client = client_result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found.")

    if payload.analyst_id is None:
        client.assigned_to_id = None
        client.assigned_to_name = None
    else:
        analyst_result = await db.execute(
            select(WebAnalyst).where(WebAnalyst.id == uuid.UUID(payload.analyst_id))
        )
        analyst = analyst_result.scalar_one_or_none()
        if analyst is None:
            raise HTTPException(status_code=404, detail="Analyst not found.")
        client.assigned_to_id = analyst.id
        client.assigned_to_name = analyst.name

    client.updated_at = datetime.now(timezone.utc)
    db.add(client)
    await db.flush()

    return {"ok": True, "assigned_to": client.assigned_to_name}


@router.get("/can-scan")
async def can_scan(
    name: str,
    country: str,
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> dict:
    result = await db.execute(
        select(Client).where(Client.name == name, Client.country == country).limit(1)
    )
    client = result.scalar_one_or_none()
    if client is not None and client.scanned_by_id is not None:
        allowed = (
            current_web_analyst.role == "admin"
            or client.scanned_by_id == current_web_analyst.id
            or client.assigned_to_id == current_web_analyst.id
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"This client has already been scanned by "
                    f"{client.scanned_by_name or 'another analyst'} "
                    f"and cannot be scanned again by a different user."
                ),
            )
    return {"can_scan": True}


@router.get("/")
async def list_clients(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_web_analyst: WebAnalyst = Depends(get_current_web_analyst),
) -> list[dict]:
    is_admin = current_web_analyst.role == "admin"
    ownership_filter = "" if is_admin else "AND (c.scanned_by_id = :user_id OR c.assigned_to_id = :user_id)"
    params: dict = {"limit": limit, "offset": offset}
    if not is_admin:
        params["user_id"] = current_web_analyst.id

    rows = await db.execute(text(f"""
        SELECT
            c.id, c.name, c.country, c.company,
            c.email, c.phone,
            c.scanned_by_name, c.scanned_by_role,
            c.assigned_to_id, c.assigned_to_name,
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
        WHERE 1=1 {ownership_filter}
        ORDER BY c.updated_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    out = []
    for row in rows.mappings():
        latest_data = row["latest_event_data"] or {}
        latest_score = latest_data.get("score") if row["latest_event_type"] == "scan" else None
        latest_links_found = latest_data.get("links_count") if row["latest_event_type"] == "scan" else None
        latest_negative_links = latest_data.get("negative_count") if row["latest_event_type"] == "scan" else None
        out.append({
            "id": str(row["id"]),
            "name": row["name"],
            "country": row["country"],
            "company": row["company"],
            "email": row["email"],
            "phone": row["phone"],
            "scanned_by_name": row["scanned_by_name"],
            "scanned_by_role": row["scanned_by_role"],
            "assigned_to_id": str(row["assigned_to_id"]) if row["assigned_to_id"] else None,
            "assigned_to_name": row["assigned_to_name"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "latest_event_type": row["latest_event_type"],
            "latest_event_at": row["latest_event_at"].isoformat() if row["latest_event_at"] else None,
            "latest_score": latest_score,
            "latest_links_found": latest_links_found,
            "latest_negative_links": latest_negative_links,
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

    if current_web_analyst.role != "admin":
        if (
            client.scanned_by_id != current_web_analyst.id
            and client.assigned_to_id != current_web_analyst.id
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    events_result = await db.execute(
        select(ClientEvent)
        .where(ClientEvent.client_id == client_id)
        .order_by(ClientEvent.created_at)
    )
    events = events_result.scalars().all()

    # Derive researcher from the first "research" event's creator
    res_id_row = await db.execute(
        select(ClientEvent.created_by_id)
        .where(ClientEvent.client_id == client_id, ClientEvent.event_type == "research")
        .order_by(ClientEvent.created_at.asc())
        .limit(1)
    )
    researched_by_id = res_id_row.scalar_one_or_none()

    # Derive scanner from the most recent "scan" event's creator
    scan_id_row = await db.execute(
        select(ClientEvent.created_by_id)
        .where(ClientEvent.client_id == client_id, ClientEvent.event_type == "scan")
        .order_by(ClientEvent.created_at.desc())
        .limit(1)
    )
    scanned_by_id = scan_id_row.scalar_one_or_none()

    # Fall back to the FK column if no event-derived ID (pre-event-tracking clients)
    effective_researcher_id = researched_by_id or client.scanned_by_id

    analyst_ids = [i for i in [effective_researcher_id, scanned_by_id] if i]
    analysts_map: dict[uuid.UUID, WebAnalyst] = {}
    if analyst_ids:
        wa_result = await db.execute(select(WebAnalyst).where(WebAnalyst.id.in_(analyst_ids)))
        for wa in wa_result.scalars():
            analysts_map[wa.id] = wa

    researched_by = analysts_map.get(effective_researcher_id) if effective_researcher_id else None
    scanned_by = analysts_map.get(scanned_by_id) if scanned_by_id else None

    return {
        "id": str(client.id),
        "name": client.name,
        "country": client.country,
        "company": client.company,
        "email": client.email,
        "phone": client.phone,
        "researched_by_name": researched_by.name if researched_by else client.scanned_by_name,
        "researched_by_role": researched_by.role if researched_by else client.scanned_by_role,
        "scanned_by_name": scanned_by.name if scanned_by else None,
        "scanned_by_role": scanned_by.role if scanned_by else None,
        "assigned_to_id": str(client.assigned_to_id) if client.assigned_to_id else None,
        "assigned_to_name": client.assigned_to_name,
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
