"""
Identity Bridge — maps novela patient_id <-> pulse patient_id via SUID.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid, hashlib, time, base64, os, asyncpg
from contextlib import asynccontextmanager
from auth import get_current_user

router = APIRouter(prefix="/identity", tags=["identity"])

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sorabbyngo:sorabbyngo@postgres:5432/novela")


@asynccontextmanager
async def get_conn():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


def _generate_suid(prefix="PAT"):
    ts = int(time.time() * 1000)
    ts_b32 = base64.b32encode(ts.to_bytes(6, "big")).decode().rstrip("=").lower()
    return f"{prefix}-{ts_b32}-{str(uuid.uuid4()).replace('-','')[:8]}"


def _suid_to_pulse_id(suid):
    return hashlib.sha256(suid.encode()).hexdigest()[:16]


class IdentityCreate(BaseModel):
    novela_patient_id: str
    full_name: str
    dob: Optional[str] = None
    national_id: Optional[str] = None
    nhif_number: Optional[str] = None


class IdentityOut(BaseModel):
    suid: str
    novela_patient_id: str
    pulse_patient_id: str
    full_name: str
    dob: Optional[str]
    national_id: Optional[str]
    nhif_number: Optional[str]


@router.post("/register", response_model=IdentityOut)
async def register_identity(body: IdentityCreate, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE novela_patient_id=$1",
            body.novela_patient_id,
        )
        if existing:
            return dict(existing)
        suid = _generate_suid("PAT")
        row = await conn.fetchrow(
            """INSERT INTO patient_identities
               (suid,novela_patient_id,pulse_patient_id,full_name,dob,national_id,nhif_number,created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,now()) RETURNING *""",
            suid, body.novela_patient_id, _suid_to_pulse_id(suid),
            body.full_name, body.dob, body.national_id, body.nhif_number,
        )
    return dict(row)


@router.get("/by-novela/{novela_patient_id}", response_model=IdentityOut)
async def by_novela(novela_patient_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE novela_patient_id=$1", novela_patient_id)
    if not row: raise HTTPException(404, "Not found — register first")
    return dict(row)


@router.get("/by-pulse/{pulse_patient_id}", response_model=IdentityOut)
async def by_pulse(pulse_patient_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE pulse_patient_id=$1", pulse_patient_id)
    if not row: raise HTTPException(404, "Not found")
    return dict(row)


@router.get("/resolve/{any_id}", response_model=IdentityOut)
async def resolve_any(any_id: str, _user=Depends(get_current_user)):
    """Accepts novela_patient_id, pulse_patient_id, SUID, or national_id."""
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """SELECT * FROM patient_identities
               WHERE novela_patient_id=$1 OR pulse_patient_id=$1
                  OR suid=$1 OR national_id=$1 LIMIT 1""",
            any_id,
        )
    if not row: raise HTTPException(404, f"No identity for: {any_id}")
    return dict(row)
