"""Karibu — Community Health Worker registration and home visit API."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from db import get_conn
from auth import get_current_user
from schemas import VitalsReading, compute_news2, alert_level
from suid import generate_suid

router = APIRouter(prefix="/chw", tags=["chw"])


class CHWRegister(BaseModel):
    full_name: str
    phone: str
    county_id: int
    sub_county: str
    ward: str
    village: str
    id_number: str  # National ID
    link_facility_id: str


class HomeVisit(BaseModel):
    chw_id: str
    patient_id: str
    household_id: str
    visit_type: str  # "routine"|"anc"|"sick_child"|"followup"
    vitals: Optional[VitalsReading] = None
    symptoms: Optional[List[str]] = None
    notes: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


@router.post("/register")
async def register_chw(body: CHWRegister, _user=Depends(get_current_user)):
    chw_id = generate_suid("CHW")
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO chws
               (id, full_name, phone, county_id, sub_county, ward, village,
                id_number, link_facility_id, active, registered_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now())
               RETURNING *""",
            chw_id, body.full_name, body.phone, body.county_id,
            body.sub_county, body.ward, body.village,
            body.id_number, body.link_facility_id,
        )
    return dict(row)


@router.post("/visits")
async def record_visit(body: HomeVisit, _user=Depends(get_current_user)):
    visit_id = str(uuid.uuid4())
    news2 = None
    alert = None
    referral_triggered = False

    if body.vitals:
        body.vitals.patient_id = body.patient_id
        news2 = compute_news2(body.vitals)
        alert = alert_level(news2)
        referral_triggered = news2 >= 5

    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO home_visits
               (id, chw_id, patient_id, household_id, visit_type,
                vitals, symptoms, notes, gps_lat, gps_lng,
                news2_score, alert_level, referral_triggered, visited_at)
               VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,now())
               RETURNING *""",
            visit_id, body.chw_id, body.patient_id, body.household_id,
            body.visit_type,
            body.vitals.json() if body.vitals else None,
            str(body.symptoms) if body.symptoms else None,
            body.notes, body.gps_lat, body.gps_lng,
            news2, alert, referral_triggered,
        )

        if referral_triggered:
            await conn.execute(
                """INSERT INTO referrals
                   (id, patient_id, source_type, source_id, reason, urgency, created_at)
                   VALUES ($1,$2,'chw_visit',$3,'NEWS2 score >= 5',$4,now())""",
                str(uuid.uuid4()), body.patient_id, visit_id,
                "urgent" if news2 >= 7 else "routine",
            )

    return {**dict(row), "referral_triggered": referral_triggered}


@router.get("/visits/{patient_id}")
async def patient_visits(patient_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT * FROM home_visits WHERE patient_id=$1 ORDER BY visited_at DESC",
            patient_id,
        )
    return [dict(r) for r in rows]
