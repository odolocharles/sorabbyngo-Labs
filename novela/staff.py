"""Novela — Staff management API."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

from .db import get_conn
from .auth import get_current_user, hash_password, require_role

router = APIRouter(prefix="/staff", tags=["staff"])


class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str  # "doctor" | "nurse" | "chw" | "admin" | "pharmacist"
    facility_id: str
    county_id: int
    phone: Optional[str] = None
    cadre: Optional[str] = None


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    cadre: Optional[str] = None
    active: Optional[bool] = None


class StaffOut(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    facility_id: str
    county_id: int
    phone: Optional[str]
    cadre: Optional[str]
    active: bool
    created_at: datetime


@router.post("/", response_model=StaffOut)
async def create_staff(
    body: StaffCreate,
    _user=Depends(require_role("admin")),
):
    staff_id = str(uuid.uuid4())
    async with get_conn() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM staff WHERE email = $1", body.email
        )
        if existing:
            raise HTTPException(400, "Email already registered")

        row = await conn.fetchrow(
            """INSERT INTO staff
               (id, full_name, email, password_hash, role, facility_id,
                county_id, phone, cadre, active, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now())
               RETURNING *""",
            staff_id, body.full_name, body.email,
            hash_password(body.password), body.role,
            body.facility_id, body.county_id,
            body.phone, body.cadre,
        )
    return dict(row)


@router.get("/{staff_id}", response_model=StaffOut)
async def get_staff(staff_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        row = await conn.fetchrow("SELECT * FROM staff WHERE id = $1", staff_id)
    if not row:
        raise HTTPException(404, "Staff not found")
    return dict(row)


@router.get("/", response_model=List[StaffOut])
async def list_staff(
    facility_id: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 50,
    _user=Depends(get_current_user),
):
    async with get_conn() as conn:
        query = "SELECT * FROM staff WHERE active = true"
        params = []
        if facility_id:
            params.append(facility_id)
            query += f" AND facility_id = ${len(params)}"
        if role:
            params.append(role)
            query += f" AND role = ${len(params)}"
        params.append(limit)
        query += f" ORDER BY full_name LIMIT ${len(params)}"
        rows = await conn.fetch(query, *params)
    return [dict(r) for r in rows]


@router.patch("/{staff_id}", response_model=StaffOut)
async def update_staff(
    staff_id: str,
    body: StaffUpdate,
    _user=Depends(require_role("admin")),
):
    updates = body.dict(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    async with get_conn() as conn:
        set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates))
        row = await conn.fetchrow(
            f"UPDATE staff SET {set_clause} WHERE id=$1 RETURNING *",
            staff_id, *updates.values()
        )
    if not row:
        raise HTTPException(404, "Staff not found")
    return dict(row)


@router.delete("/{staff_id}")
async def deactivate_staff(
    staff_id: str, _user=Depends(require_role("admin"))
):
    async with get_conn() as conn:
        await conn.execute(
            "UPDATE staff SET active=false WHERE id=$1", staff_id
        )
    return {"status": "deactivated"}
