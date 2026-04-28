"""Novela — Login endpoint: returns JWT access token."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, asyncpg
from contextlib import asynccontextmanager
from auth import verify_password, create_access_token, create_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sorabbyngo:sorabbyngo@postgres:5432/novela")


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    facility_id: str


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest):
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        row = await conn.fetchrow(
            "SELECT * FROM staff WHERE email=$1 AND active=true", body.email
        )
    finally:
        await conn.close()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "access_token": create_access_token(row["id"], row["role"], row["facility_id"]),
        "refresh_token": create_refresh_token(row["id"]),
        "token_type": "bearer",
        "role": row["role"],
        "facility_id": row["facility_id"],
    }


@router.post("/dev-token")
async def dev_token():
    """
    Development-only endpoint — returns a valid admin token without credentials.
    Remove or disable in production via DEV_MODE env var.
    """
    if os.getenv("DEV_MODE", "true").lower() != "true":
        raise HTTPException(403, "Not available in production")
    token = create_access_token("dev-user", "admin", "dev-facility")
    return {"access_token": token, "token_type": "bearer"}
