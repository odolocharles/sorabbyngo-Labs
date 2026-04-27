"""Dawa — Drug forecasting with seasonal malaria calendar + KEMSA procurement."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid
import math

from ..novela.db import get_conn
from ..novela.auth import get_current_user
from ..shared.constants.kenya import MALARIA_SEASON, KEMSA_CATEGORIES

router = APIRouter(prefix="/dawa", tags=["dawa"])

SAFETY_STOCK_MONTHS = 2
LEAD_TIME_MONTHS = 1.5


def seasonal_factor(drug: str, month: int) -> float:
    """Apply seasonal multiplier for malaria drugs."""
    malaria_drugs = ["artemether", "lumefantrine", "quinine", "fansidar", "coartem"]
    if any(d in drug.lower() for d in malaria_drugs):
        return 1.4 if month in MALARIA_SEASON["high"] else 0.9
    return 1.0


def forecast_quantity(
    avg_monthly_consumption: float,
    months_to_forecast: int,
    drug_name: str,
    current_month: int,
) -> List[dict]:
    results = []
    for i in range(months_to_forecast):
        m = ((current_month - 1 + i) % 12) + 1
        factor = seasonal_factor(drug_name, m)
        qty = math.ceil(avg_monthly_consumption * factor)
        results.append({"month_offset": i + 1, "month": m, "forecasted_qty": qty, "factor": factor})
    return results


class ForecastRequest(BaseModel):
    facility_id: str
    drug_name: str
    avg_monthly_consumption: float
    current_stock: int
    months: int = 6


class ProcurementOrder(BaseModel):
    facility_id: str
    items: List[dict]  # [{drug_name, quantity, unit, category}]
    route: str = "kemsa"  # "kemsa"|"direct"|"emergency"
    priority: str = "routine"  # "routine"|"urgent"|"emergency"
    notes: Optional[str] = None


@router.post("/forecast")
async def forecast(body: ForecastRequest, _user=Depends(get_current_user)):
    current_month = datetime.utcnow().month
    projection = forecast_quantity(
        body.avg_monthly_consumption,
        body.months,
        body.drug_name,
        current_month,
    )
    total_needed = sum(p["forecasted_qty"] for p in projection)
    reorder_point = math.ceil(
        body.avg_monthly_consumption * (SAFETY_STOCK_MONTHS + LEAD_TIME_MONTHS)
    )
    return {
        "drug": body.drug_name,
        "current_stock": body.current_stock,
        "reorder_point": reorder_point,
        "needs_reorder": body.current_stock <= reorder_point,
        "total_forecasted": total_needed,
        "order_quantity": max(0, total_needed - body.current_stock),
        "projection": projection,
    }


@router.post("/procurement")
async def create_procurement(body: ProcurementOrder, _user=Depends(get_current_user)):
    order_id = str(uuid.uuid4())
    order_ref = f"KEMSA-{datetime.utcnow().strftime('%Y%m%d')}-{order_id[:6].upper()}"
    async with get_conn() as conn:
        row = await conn.fetchrow(
            """INSERT INTO procurement_orders
               (id, order_ref, facility_id, items, route, priority, status, notes, created_at)
               VALUES ($1,$2,$3,$4::jsonb,$5,$6,'pending',$7,now())
               RETURNING *""",
            order_id, order_ref, body.facility_id,
            str(body.items), body.route, body.priority, body.notes,
        )
    return {**dict(row), "order_ref": order_ref}


@router.get("/procurement/{facility_id}")
async def facility_orders(facility_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT * FROM procurement_orders WHERE facility_id=$1 ORDER BY created_at DESC",
            facility_id,
        )
    return [dict(r) for r in rows]


@router.get("/stock/{facility_id}")
async def facility_stock(facility_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT * FROM drug_stock WHERE facility_id=$1 ORDER BY drug_name",
            facility_id,
        )
    return [dict(r) for r in rows]
