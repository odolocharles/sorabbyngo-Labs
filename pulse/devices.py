"""Pulse — Medical devices registry API."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from ..novela.db import get_conn
from ..novela.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["devices"])


class DeviceCreate(BaseModel):
    serial: str
    type: str  # "pulse_oximeter"|"bp_monitor"|"ecg"|"thermometer"|"ventilator"
    manufacturer: str
    model: str
    facility_id: str
    ward: Optional[str] = None
    mqtt_topic: Optional[str] = None


class DeviceUpdate(BaseModel):
    ward: Optional[str] = None
    status: Optional[str] = None  # "active"|"maintenance"|"retired"
    last_calibrated: Optional[datetime] = None


@router.post("/")
async def register_device(body: DeviceCreate, _user=Depends(get_current_user)):
    device_id = str(uuid.uuid4())
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO devices
               (id, serial, type, manufacturer, model, facility_id,
                ward, mqtt_topic, status, registered_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',now())
               RETURNING *""",
            device_id, body.serial, body.type, body.manufacturer,
            body.model, body.facility_id, body.ward, body.mqtt_topic,
        )
    return dict(row)


@router.get("/")
async def list_devices(
    facility_id: Optional[str] = None,
    ward: Optional[str] = None,
    status: str = "active",
    _user=Depends(get_current_user),
):
    async with get_conn() as conn:
        query = "SELECT * FROM devices WHERE status=$1"
        params: list = [status]
        if facility_id:
            params.append(facility_id)
            query += f" AND facility_id=${len(params)}"
        if ward:
            params.append(ward)
            query += f" AND ward=${len(params)}"
        rows = await conn.fetch(query, *params)
    return [dict(r) for r in rows]


@router.patch("/{device_id}")
async def update_device(
    device_id: str,
    body: DeviceUpdate,
    _user=Depends(get_current_user),
):
    updates = body.dict(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    async with get_conn() as conn:
        set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates))
        row = await conn.fetchrow(
            f"UPDATE devices SET {set_clause} WHERE id=$1 RETURNING *",
            device_id, *updates.values(),
        )
    if not row:
        raise HTTPException(404, "Device not found")
    return dict(row)
