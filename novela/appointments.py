"""Novela — Appointments API."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from db import get_conn
from auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


class AppointmentCreate(BaseModel):
    patient_id: str
    provider_id: str
    facility_id: str
    scheduled_at: datetime
    type: str  # "outpatient" | "anc" | "followup" | "procedure"
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None  # "confirmed"|"cancelled"|"completed"|"no_show"
    notes: Optional[str] = None
    outcome: Optional[str] = None


@router.post("/")
async def book_appointment(body: AppointmentCreate, _user=Depends(get_current_user)):
    appt_id = str(uuid.uuid4())
    async with get_conn() as conn:
        conflict = await conn.fetchrow(
            """SELECT id FROM appointments
               WHERE provider_id=$1 AND scheduled_at=$2 AND status != 'cancelled'""",
            body.provider_id, body.scheduled_at,
        )
        if conflict:
            raise HTTPException(409, "Provider already has appointment at this time")
        row = await conn.fetchrow(
            """INSERT INTO appointments
               (id, patient_id, provider_id, facility_id, scheduled_at,
                type, status, notes, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,now())
               RETURNING *""",
            appt_id, body.patient_id, body.provider_id,
            body.facility_id, body.scheduled_at, body.type, body.notes,
        )
    return dict(row)


@router.get("/patient/{patient_id}")
async def patient_appointments(
    patient_id: str,
    upcoming_only: bool = False,
    _user=Depends(get_current_user),
):
    async with get_conn() as conn:
        query = "SELECT * FROM appointments WHERE patient_id=$1"
        if upcoming_only:
            query += " AND scheduled_at > now() AND status = 'confirmed'"
        query += " ORDER BY scheduled_at"
        rows = await conn.fetch(query, patient_id)
    return [dict(r) for r in rows]


@router.get("/provider/{provider_id}")
async def provider_schedule(
    provider_id: str,
    date: Optional[str] = None,
    _user=Depends(get_current_user),
):
    async with get_conn() as conn:
        if date:
            rows = await conn.fetch(
                """SELECT * FROM appointments
                   WHERE provider_id=$1
                   AND scheduled_at::date = $2::date
                   AND status != 'cancelled'
                   ORDER BY scheduled_at""",
                provider_id, date,
            )
        else:
            rows = await conn.fetch(
                """SELECT * FROM appointments
                   WHERE provider_id=$1 AND scheduled_at > now()
                   AND status != 'cancelled'
                   ORDER BY scheduled_at LIMIT 50""",
                provider_id,
            )
    return [dict(r) for r in rows]


@router.patch("/{appt_id}")
async def update_appointment(
    appt_id: str,
    body: AppointmentUpdate,
    _user=Depends(get_current_user),
):
    updates = body.dict(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    async with get_conn() as conn:
        set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates))
        row = await conn.fetchrow(
            f"UPDATE appointments SET {set_clause} WHERE id=$1 RETURNING *",
            appt_id, *updates.values(),
        )
    if not row:
        raise HTTPException(404, "Appointment not found")
    return dict(row)


@router.delete("/{appt_id}")
async def cancel_appointment(appt_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        await conn.execute(
            "UPDATE appointments SET status='cancelled' WHERE id=$1", appt_id
        )
    return {"status": "cancelled"}
