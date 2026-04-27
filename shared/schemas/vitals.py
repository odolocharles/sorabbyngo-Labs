"""Canonical VitalsReading schema shared across all modules."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class VitalsReading(BaseModel):
    reading_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    ward: str
    device_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Core vitals
    heart_rate: Optional[int] = Field(None, ge=0, le=300)
    systolic_bp: Optional[int] = Field(None, ge=0, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=0, le=200)
    spo2: Optional[float] = Field(None, ge=0, le=100)
    temperature: Optional[float] = Field(None, ge=30, le=45)
    respiratory_rate: Optional[int] = Field(None, ge=0, le=100)
    consciousness: Optional[str] = Field(None, description="AVPU scale: A/V/P/U")

    # Computed
    news2_score: Optional[int] = None
    alert_level: Optional[str] = None  # "green" | "amber" | "red"

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


def compute_news2(v: VitalsReading) -> int:
    """Calculate NEWS2 score from vitals."""
    score = 0

    if v.respiratory_rate is not None:
        rr = v.respiratory_rate
        if rr <= 8 or rr >= 25:
            score += 3
        elif rr >= 21:
            score += 2
        elif rr <= 11:
            score += 1

    if v.spo2 is not None:
        spo2 = v.spo2
        if spo2 <= 91:
            score += 3
        elif spo2 <= 93:
            score += 2
        elif spo2 <= 95:
            score += 1

    if v.systolic_bp is not None:
        sbp = v.systolic_bp
        if sbp <= 90 or sbp >= 220:
            score += 3
        elif sbp <= 100:
            score += 2
        elif sbp <= 110:
            score += 1

    if v.heart_rate is not None:
        hr = v.heart_rate
        if hr <= 40 or hr >= 131:
            score += 3
        elif hr >= 111:
            score += 2
        elif hr <= 50 or hr >= 91:
            score += 1

    if v.temperature is not None:
        temp = v.temperature
        if temp <= 35.0:
            score += 3
        elif temp >= 39.1:
            score += 2
        elif temp >= 38.1:
            score += 1
        elif temp <= 36.0:
            score += 1

    if v.consciousness and v.consciousness != "A":
        score += 3

    return score


def alert_level(score: int) -> str:
    if score >= 7:
        return "red"
    elif score >= 5:
        return "amber"
    elif score >= 1:
        return "yellow"
    return "green"
