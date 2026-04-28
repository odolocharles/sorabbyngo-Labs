"""Karibu — Maternal ANC (Antenatal Care) API with danger sign detection."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid

from db import get_conn
from auth import get_current_user

router = APIRouter(prefix="/anc", tags=["anc"])

DANGER_SIGNS = {
    "severe_headache": "Possible pre-eclampsia",
    "visual_disturbance": "Possible pre-eclampsia",
    "epigastric_pain": "Possible HELLP syndrome",
    "heavy_bleeding": "Possible placenta praevia/abruption",
    "convulsions": "Eclampsia — emergency",
    "reduced_fetal_movement": "Fetal distress",
    "severe_vomiting": "Hyperemesis gravidarum",
    "fever": "Possible infection/malaria",
    "difficulty_breathing": "Possible cardiac/respiratory complication",
    "severe_anemia": "Haemoglobin < 7g/dL",
}


class ANCVisit(BaseModel):
    patient_id: str
    facility_id: str
    provider_id: str
    gestational_age_weeks: int
    weight_kg: Optional[float] = None
    blood_pressure: Optional[str] = None  # "120/80"
    haemoglobin_gdl: Optional[float] = None
    fundal_height_cm: Optional[float] = None
    fetal_heart_rate: Optional[int] = None
    presentation: Optional[str] = None  # "cephalic"|"breech"|"transverse"
    danger_signs: Optional[List[str]] = None
    hiv_status: Optional[str] = None
    malaria_test: Optional[str] = None  # "positive"|"negative"|"not_done"
    notes: Optional[str] = None
    next_visit_date: Optional[date] = None


@router.post("/visits")
async def record_anc_visit(body: ANCVisit, _user=Depends(get_current_user)):
    visit_id = str(uuid.uuid4())
    detected_dangers = []
    referral_needed = False

    if body.danger_signs:
        detected_dangers = [
            {"sign": s, "implication": DANGER_SIGNS.get(s, "Review needed")}
            for s in body.danger_signs
            if s in DANGER_SIGNS
        ]
        referral_needed = any(
            s in ["convulsions", "heavy_bleeding", "severe_anemia"]
            for s in body.danger_signs
        )

    if body.haemoglobin_gdl and body.haemoglobin_gdl < 7.0:
        detected_dangers.append({"sign": "severe_anemia", "implication": DANGER_SIGNS["severe_anemia"]})
        referral_needed = True

    # Parse BP for pre-eclampsia check
    if body.blood_pressure:
        try:
            systolic = int(body.blood_pressure.split("/")[0])
            if systolic >= 160:
                detected_dangers.append({"sign": "severe_hypertension", "implication": "Possible severe pre-eclampsia"})
                referral_needed = True
        except Exception:
            pass

    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO anc_visits
               (id, patient_id, facility_id, provider_id, gestational_age_weeks,
                weight_kg, blood_pressure, haemoglobin_gdl, fundal_height_cm,
                fetal_heart_rate, presentation, danger_signs, hiv_status,
                malaria_test, notes, next_visit_date, referral_needed, visited_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,now())
               RETURNING *""",
            visit_id, body.patient_id, body.facility_id, body.provider_id,
            body.gestational_age_weeks, body.weight_kg, body.blood_pressure,
            body.haemoglobin_gdl, body.fundal_height_cm, body.fetal_heart_rate,
            body.presentation, str(body.danger_signs), body.hiv_status,
            body.malaria_test, body.notes, body.next_visit_date, referral_needed,
        )

    return {
        **dict(row),
        "detected_dangers": detected_dangers,
        "referral_needed": referral_needed,
    }


@router.get("/history/{patient_id}")
async def anc_history(patient_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT * FROM anc_visits WHERE patient_id=$1 ORDER BY visited_at",
            patient_id,
        )
    return [dict(r) for r in rows]


@router.get("/dashboard/facility/{facility_id}")
async def facility_anc_dashboard(facility_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        stats = await conn.fetchrow(
            """SELECT
               COUNT(*) as total_visits,
               COUNT(CASE WHEN referral_needed THEN 1 END) as referrals,
               COUNT(CASE WHEN malaria_test='positive' THEN 1 END) as malaria_positive,
               AVG(haemoglobin_gdl) as avg_hgb
               FROM anc_visits
               WHERE facility_id=$1 AND visited_at > now() - interval '30 days'""",
            facility_id,
        )
    return dict(stats)
