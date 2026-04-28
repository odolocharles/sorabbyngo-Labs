"""Taifa — National/County analytics, surveillance alerts, DHIS2 integration."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import httpx
import os

from db import get_conn
from auth import get_current_user, require_role
from kenya import COUNTIES

router = APIRouter(prefix="/taifa", tags=["taifa"])

DHIS2_BASE = os.getenv("DHIS2_BASE_URL", "https://play.dhis2.org/2.39.1")
DHIS2_USER = os.getenv("DHIS2_USER", "admin")
DHIS2_PASS = os.getenv("DHIS2_PASS", "district")


class SurveillanceAlert(BaseModel):
    county_id: int
    disease: str
    cases: int
    deaths: int
    alert_date: date
    notes: Optional[str] = None
    threshold_exceeded: bool = False


async def dhis2_post(endpoint: str, payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{DHIS2_BASE}/api/{endpoint}",
            json=payload,
            auth=(DHIS2_USER, DHIS2_PASS),
            headers={"Content-Type": "application/json"},
        )
    return resp.json()


@router.get("/analytics/county/{county_id}")
async def county_analytics(
    county_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    _user=Depends(get_current_user),
):
    county_name = COUNTIES.get(county_id, "Unknown")
    async with get_conn() as conn:
        stats = await conn.fetchrow(
            """SELECT
               COUNT(DISTINCT a.id) as total_appointments,
               COUNT(DISTINCT hv.id) as home_visits,
               COUNT(DISTINCT anc.id) as anc_visits,
               COUNT(DISTINCT anc.id) FILTER (WHERE anc.referral_needed) as anc_referrals,
               COUNT(DISTINCT po.id) as procurement_orders
               FROM staff s
               LEFT JOIN appointments a ON a.facility_id = s.facility_id
               LEFT JOIN home_visits hv ON hv.chw_id IN (
                   SELECT id FROM chws WHERE county_id=$1
               )
               LEFT JOIN anc_visits anc ON anc.facility_id = s.facility_id
               LEFT JOIN procurement_orders po ON po.facility_id = s.facility_id
               WHERE s.county_id=$1""",
            county_id,
        )
    return {
        "county_id": county_id,
        "county_name": county_name,
        "stats": dict(stats),
        "period": {"from": str(from_date), "to": str(to_date)},
    }


@router.get("/analytics/national")
async def national_overview(_user=Depends(require_role("admin", "analyst"))):
    async with get_conn() as conn:
        rows = await conn.fetch(
            """SELECT s.county_id,
               COUNT(DISTINCT a.id) as appointments,
               COUNT(DISTINCT hv.id) as home_visits
               FROM staff s
               LEFT JOIN appointments a ON a.facility_id = s.facility_id
               LEFT JOIN home_visits hv ON hv.chw_id IN (
                   SELECT id FROM chws WHERE county_id = s.county_id
               )
               GROUP BY s.county_id
               ORDER BY s.county_id"""
        )
    return [
        {**dict(r), "county_name": COUNTIES.get(r["county_id"], "Unknown")}
        for r in rows
    ]


@router.post("/surveillance/alerts")
async def create_alert(body: SurveillanceAlert, _user=Depends(get_current_user)):
    county_name = COUNTIES.get(body.county_id, "Unknown")
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO surveillance_alerts
               (county_id, county_name, disease, cases, deaths, alert_date,
                notes, threshold_exceeded, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
               RETURNING *""",
            body.county_id, county_name, body.disease, body.cases,
            body.deaths, body.alert_date, body.notes, body.threshold_exceeded,
        )
    return dict(row)


@router.get("/surveillance/alerts")
async def list_alerts(
    county_id: Optional[int] = None,
    disease: Optional[str] = None,
    _user=Depends(get_current_user),
):
    async with get_conn() as conn:
        query = "SELECT * FROM surveillance_alerts WHERE 1=1"
        params = []
        if county_id:
            params.append(county_id)
            query += f" AND county_id=${len(params)}"
        if disease:
            params.append(disease)
            query += f" AND disease ILIKE ${len(params)}"
        query += " ORDER BY alert_date DESC LIMIT 100"
        rows = await conn.fetch(query, *params)
    return [dict(r) for r in rows]


@router.post("/dhis2/push/{data_element_id}")
async def push_to_dhis2(
    data_element_id: str,
    value: float,
    org_unit: str,
    period: str,
    _user=Depends(require_role("admin")),
):
    payload = {
        "dataValues": [
            {
                "dataElement": data_element_id,
                "period": period,
                "orgUnit": org_unit,
                "value": str(value),
            }
        ]
    }
    result = await dhis2_post("dataValueSets", payload)
    return result
