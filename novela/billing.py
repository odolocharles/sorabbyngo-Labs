"""Novela — Billing API: NHIF claims + M-Pesa STK push."""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import httpx
import os

from .db import get_conn
from .auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])

MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "")
MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "https://api.sorabbyngo.io/billing/mpesa/callback")


class InvoiceCreate(BaseModel):
    patient_id: str
    facility_id: str
    items: List[dict]  # [{description, quantity, unit_price_kes}]
    nhif_number: Optional[str] = None
    nhif_package: Optional[str] = None


class MpesaPayRequest(BaseModel):
    invoice_id: str
    phone: str  # 2547XXXXXXXX
    amount_kes: float


class NHIFClaimCreate(BaseModel):
    invoice_id: str
    nhif_number: str
    package_code: str
    diagnosis_codes: List[str]  # ICD-10


async def get_mpesa_token() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            auth=(MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET),
        )
        return resp.json()["access_token"]


@router.post("/invoices")
async def create_invoice(body: InvoiceCreate, _user=Depends(get_current_user)):
    invoice_id = str(uuid.uuid4())
    total = sum(i["quantity"] * i["unit_price_kes"] for i in body.items)
    async with get_conn() as conn:
        await conn.execute(
            """INSERT INTO invoices
               (id, patient_id, facility_id, items, total_kes,
                nhif_number, nhif_package, status, created_at)
               VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'pending',now())""",
            invoice_id, body.patient_id, body.facility_id,
            str(body.items), total, body.nhif_number, body.nhif_package,
        )
    return {"invoice_id": invoice_id, "total_kes": total}


@router.post("/mpesa/stk-push")
async def mpesa_stk_push(
    body: MpesaPayRequest,
    background: BackgroundTasks,
    _user=Depends(get_current_user),
):
    import base64
    from datetime import datetime
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{ts}".encode()
    ).decode()

    token = await get_mpesa_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "BusinessShortCode": MPESA_SHORTCODE,
                "Password": password,
                "Timestamp": ts,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(body.amount_kes),
                "PartyA": body.phone,
                "PartyB": MPESA_SHORTCODE,
                "PhoneNumber": body.phone,
                "CallBackURL": MPESA_CALLBACK_URL,
                "AccountReference": body.invoice_id[:12],
                "TransactionDesc": "Sorabbyngo Health Payment",
            },
        )
    data = resp.json()
    checkout_id = data.get("CheckoutRequestID")
    async with get_conn() as conn:
        await conn.execute(
            """INSERT INTO mpesa_transactions
               (id, invoice_id, checkout_request_id, phone, amount_kes, status, created_at)
               VALUES ($1,$2,$3,$4,$5,'pending',now())""",
            str(uuid.uuid4()), body.invoice_id, checkout_id,
            body.phone, body.amount_kes,
        )
    return {"checkout_request_id": checkout_id, "response": data}


@router.post("/mpesa/callback")
async def mpesa_callback(payload: dict):
    result = payload.get("Body", {}).get("stkCallback", {})
    checkout_id = result.get("CheckoutRequestID")
    result_code = result.get("ResultCode")
    status = "success" if result_code == 0 else "failed"
    async with get_conn() as conn:
        await conn.execute(
            "UPDATE mpesa_transactions SET status=$1 WHERE checkout_request_id=$2",
            status, checkout_id,
        )
        if status == "success":
            await conn.execute(
                """UPDATE invoices SET status='paid', paid_at=now()
                   WHERE id=(SELECT invoice_id FROM mpesa_transactions WHERE checkout_request_id=$1)""",
                checkout_id,
            )
    return {"status": "ok"}


@router.post("/nhif/claims")
async def submit_nhif_claim(body: NHIFClaimCreate, _user=Depends(get_current_user)):
    claim_id = str(uuid.uuid4())
    async with get_conn() as conn:
        await conn.execute(
            """INSERT INTO nhif_claims
               (id, invoice_id, nhif_number, package_code, diagnosis_codes, status, submitted_at)
               VALUES ($1,$2,$3,$4,$5::jsonb,'submitted',now())""",
            claim_id, body.invoice_id, body.nhif_number,
            body.package_code, str(body.diagnosis_codes),
        )
    return {"claim_id": claim_id, "status": "submitted"}


@router.get("/invoices/{patient_id}")
async def patient_invoices(patient_id: str, _user=Depends(get_current_user)):
    async with get_conn() as conn:
        rows = await conn.fetch(
            "SELECT * FROM invoices WHERE patient_id=$1 ORDER BY created_at DESC",
            patient_id,
        )
    return [dict(r) for r in rows]
