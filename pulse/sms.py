"""Pulse — SMS alerts via Africa's Talking."""
import os
import httpx

AT_API_KEY = os.getenv("AT_API_KEY", "")
AT_USERNAME = os.getenv("AT_USERNAME", "sandbox")
AT_SENDER_ID = os.getenv("AT_SENDER_ID", "Sorabbyngo")
ALERT_PHONE = os.getenv("ALERT_PHONE", "+254700000000")

AT_BASE = "https://api.africastalking.com/version1"


async def send_sms(to: str, message: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AT_BASE}/messaging",
            headers={
                "apiKey": AT_API_KEY,
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "username": AT_USERNAME,
                "to": to,
                "message": message,
                "from": AT_SENDER_ID,
            },
        )
    return resp.json()


async def send_alert_sms(message: str, to: str = ALERT_PHONE) -> dict:
    """Send clinical alert SMS to duty nurse/doctor."""
    return await send_sms(to, f"[SORABBYNGO ALERT] {message}")
