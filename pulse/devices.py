"""Pulse — Medical devices registry API."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid, os, asyncpg
from contextlib import asynccontextmanager
from auth import get_current_user

router = APIRouter(prefix="/devices", tags=["devices"])

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sorabbyngo:sorabbyngo@postgres:5432/novela")


@asynccontextmanager
async def get_conn():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


class DeviceCreate(BaseModel):
    serial: str
    type: str
    manufacturer: str
    model: str
    facility_id: str
    ward: Optional[str] = None
    mqtt_topic: Optional[str] = None


@router.post("/")
async def register_device(body: DeviceCreate, _user=Depends(get_current_user)):
    device_id = str(uuid.uuid4())
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO devices (id,serial,type,manufacturer,model,facility_id,ward,mqtt_topic,status,registered_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',now()) RETURNING *""",
            device_id, body.serial, body.type, body.manufacturer,
            body.model, body.facility_id, body.ward, body.mqtt_topic,
        )
    return dict(row)


@router.get("/")
async def list_devices(facility_id: Optional[str] = None, ward: Optional[str] = None,
                       status: str = "active", _user=Depends(get_current_user)):
    async with get_conn() as conn:
        query = "SELECT * FROM devices WHERE status=$1"
        params: list = [status]
        if facility_id:
            params.append(facility_id); query += f" AND facility_id=${len(params)}"
        if ward:
            params.append(ward); query += f" AND ward=${len(params)}"
        rows = await conn.fetch(query, *params)
    return [dict(r) for r in rows]
