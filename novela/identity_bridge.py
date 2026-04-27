"""
Identity Bridge — maps novela patient_id ↔ pulse patient_id via SUID.

Problem: novela uses UUID-style patient IDs, pulse uses raw patient_id strings.
This bridge issues a canonical SUID for each patient and provides lookup in both directions.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid

from .db import get_conn
from .auth import get_current_user
from ..shared.utils.suid import generate_suid, suid_to_patient_id

router = APIRouter(prefix="/identity", tags=["identity"])


class IdentityCreate(BaseModel):
    novela_patient_id: str
    full_name: str
    dob: Optional[str] = None          # YYYY-MM-DD
    national_id: Optional[str] = None
    nhif_number: Optional[str] = None


class IdentityOut(BaseModel):
    suid: str
    novela_patient_id: str
    pulse_patient_id: str              # SHA-256 fragment of SUID
    full_name: str
    dob: Optional[str]
    national_id: Optional[str]
    nhif_number: Optional[str]


@router.post("/register", response_model=IdentityOut)
async def register_identity(body: IdentityCreate, _user=Depends(get_current_user)):
    """Issue a SUID for a new patient and create the cross-module identity record."""
    async with get_conn() as conn:
        # Idempotent — return existing if already registered
        existing = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE novela_patient_id = $1",
            body.novela_patient_id,
        )
        if existing:
            return dict(existing)

        suid = generate_suid("PAT")
        pulse_id = suid_to_patient_id(suid)

        row = await conn.fetchrow(
            """INSERT INTO patient_identities
               (suid, novela_patient_id, pulse_patient_id,
                full_name, dob, national_id, nhif_number, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, now())
               RETURNING *""",
            suid, body.novela_patient_id, pulse_id,
            body.full_name, body.dob, body.national_id, body.nhif_number,
        )
    return dict(row)


@router.get("/by-novela/{novela_patient_id}", response_model=IdentityOut)
async def lookup_by_novela(novela_patient_id: str, _user=Depends(get_current_user)):
    """Resolve a novela patient_id to its SUID + pulse_patient_id."""
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE novela_patient_id = $1",
            novela_patient_id,
        )
    if not row:
        raise HTTPException(404, "No identity record for this novela_patient_id")
    return dict(row)


@router.get("/by-pulse/{pulse_patient_id}", response_model=IdentityOut)
async def lookup_by_pulse(pulse_patient_id: str, _user=Depends(get_current_user)):
    """Resolve a pulse patient_id back to novela_patient_id + SUID."""
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE pulse_patient_id = $1",
            pulse_patient_id,
        )
    if not row:
        raise HTTPException(404, "No identity record for this pulse_patient_id")
    return dict(row)


@router.get("/by-suid/{suid}", response_model=IdentityOut)
async def lookup_by_suid(suid: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE suid = $1", suid
        )
    if not row:
        raise HTTPException(404, "SUID not found")
    return dict(row)


@router.get("/by-national-id/{national_id}", response_model=IdentityOut)
async def lookup_by_national_id(national_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM patient_identities WHERE national_id = $1", national_id
        )
    if not row:
        raise HTTPException(404, "National ID not found")
    return dict(row)
