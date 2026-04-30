"""Pulse — Vitals API."""
from fastapi import APIRouter, Depends
from typing import List, Optional

from influx import write_vitals, query_vitals
from schemas import VitalsReading, compute_news2, alert_level
from auth import get_current_user
from sms import send_alert_sms

router = APIRouter(prefix="/vitals", tags=["vitals"])


@router.post("/", response_model=VitalsReading)
async def record_vitals(body: VitalsReading, _user=Depends(get_current_user)):
    body.news2_score = compute_news2(body)
    body.alert_level = alert_level(body.news2_score)
    await write_vitals(body)
    if body.news2_score and body.news2_score >= 5:
        await send_alert_sms(
            f"ALERT: Patient {body.patient_id} NEWS2={body.news2_score} "
            f"({body.alert_level.upper()}) in ward {body.ward}."
        )
    return body


@router.get("/{patient_id}")
async def get_patient_vitals(
    patient_id: str, hours: int = 24, _user=Depends(get_current_user)
):
    try:
        return await query_vitals(patient_id=patient_id, hours=hours)
    except Exception:
        return []


@router.get("/ward/{ward}/latest")
async def ward_latest(ward: str, _user=Depends(get_current_user)):
    try:
        return await query_vitals(ward=ward, hours=1)
    except Exception:
        return []


@router.get("/alerts/active")
async def active_alerts(
    ward: Optional[str] = None,
    min_news2: int = 5,
    _user=Depends(get_current_user),
):
    try:
        readings = await query_vitals(ward=ward, hours=6)
        alerts = [r for r in readings if r.get("news2_score", 0) >= min_news2]
        return sorted(alerts, key=lambda x: x.get("news2_score", 0), reverse=True)
    except Exception:
        return []
