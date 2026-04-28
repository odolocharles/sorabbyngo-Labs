"""
identity_core.py — Forensics & integrity utilities for patient record auditing.

Fixes:
  1. filter_by_date_range — previous bug used naive datetime comparison,
     causing records at timezone boundaries to be wrongly included/excluded.
     Fix: normalise all inputs to UTC-aware datetimes before comparison.

  2. HMAC checksum upgrade — previous version used plain SHA-256 (no secret),
     making checksums forgeable. Upgraded to HMAC-SHA256 with a server secret.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import date, datetime, timezone
from typing import Any, Callable, List, TypeVar

T = TypeVar("T")

CHECKSUM_SECRET = os.getenv("CHECKSUM_SECRET", "change-me-in-production").encode()


# ─── 1. filter_by_date_range (forensics fix) ─────────────────────────────────

def _to_utc(dt: Any) -> datetime:
    """
    Coerce date / naive datetime / aware datetime → UTC-aware datetime.

    Previous bug: naive datetimes were compared directly against aware ones,
    raising TypeError or silently giving wrong results at DST/tz boundaries.
    """
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            # Assume UTC — was previously left as naive (the bug)
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    if isinstance(dt, date):
        # date-only → start of that day UTC
        return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)
    raise TypeError(f"Expected date or datetime, got {type(dt).__name__}")


def filter_by_date_range(
    records: List[T],
    start: Any,
    end: Any,
    key: Callable[[T], Any],
) -> List[T]:
    """
    Return records whose timestamp (via `key`) falls within [start, end] inclusive.

    Args:
        records:  Any list of objects.
        start:    Lower bound — date, naive datetime (UTC assumed), or aware datetime.
        end:      Upper bound — same.
        key:      Callable extracting the datetime field from each record.

    Example:
        visits = filter_by_date_range(
            all_visits,
            start=date(2026, 1, 1),
            end=date(2026, 3, 31),
            key=lambda v: v["visited_at"],
        )
    """
    utc_start = _to_utc(start)
    utc_end = _to_utc(end)
    if utc_start > utc_end:
        raise ValueError(f"start ({utc_start}) must be <= end ({utc_end})")

    result = []
    for record in records:
        ts = _to_utc(key(record))
        if utc_start <= ts <= utc_end:
            result.append(record)
    return result


# ─── 2. HMAC checksum (upgrade from plain SHA-256) ───────────────────────────

def _canonical(data: dict) -> bytes:
    """
    Stable JSON serialisation for checksum input.
    Keys sorted, datetimes ISO-formatted, deterministic across Python versions.
    """
    def default(obj: Any) -> str:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        raise TypeError(f"Not serialisable: {type(obj)}")

    return json.dumps(data, sort_keys=True, default=default, ensure_ascii=True).encode()


def compute_checksum(record: dict, secret: bytes = CHECKSUM_SECRET) -> str:
    """
    Return HMAC-SHA256 hex digest of `record`.

    Upgrade from plain SHA-256:
      Old (forgeable):  hashlib.sha256(json.dumps(record).encode()).hexdigest()
      New (keyed):      hmac.new(secret, canonical(record), sha256).hexdigest()

    The secret is injected from env var CHECKSUM_SECRET so it never lives in code.
    """
    return hmac.new(secret, _canonical(record), hashlib.sha256).hexdigest()


def verify_checksum(record: dict, expected: str, secret: bytes = CHECKSUM_SECRET) -> bool:
    """
    Constant-time comparison to prevent timing attacks.
    Returns True if the record's checksum matches `expected`.
    """
    actual = compute_checksum(record, secret)
    return hmac.compare_digest(actual, expected)


def sign_record(record: dict, secret: bytes = CHECKSUM_SECRET) -> dict:
    """Return a copy of `record` with a `_checksum` field appended."""
    unsigned = {k: v for k, v in record.items() if k != "_checksum"}
    return {**unsigned, "_checksum": compute_checksum(unsigned, secret)}


def verify_record(record: dict, secret: bytes = CHECKSUM_SECRET) -> bool:
    """Return True if record carries a valid `_checksum`."""
    checksum = record.get("_checksum")
    if not checksum:
        return False
    unsigned = {k: v for k, v in record.items() if k != "_checksum"}
    return verify_checksum(unsigned, checksum, secret)


# ─── Self-test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from datetime import timedelta

    print("=== filter_by_date_range ===")
    records = [
        {"id": 1, "visited_at": datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)},
        {"id": 2, "visited_at": datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc)},
        {"id": 3, "visited_at": datetime(2026, 4, 20, tzinfo=timezone.utc)},
        # naive datetime — previously caused comparison bug
        {"id": 4, "visited_at": datetime(2026, 2, 10, 12, 0)},
    ]
    result = filter_by_date_range(
        records,
        start=date(2026, 1, 1),
        end=date(2026, 3, 31),
        key=lambda r: r["visited_at"],
    )
    print(f"In range Jan–Mar 2026: {[r['id'] for r in result]}")  # expect [1, 2, 4]

    print("\n=== HMAC checksum ===")
    patient = {"id": "PAT-abc123", "name": "Jane Doe", "dob": date(1990, 5, 1)}
    signed = sign_record(patient)
    print(f"Signed:  {signed}")
    print(f"Valid:   {verify_record(signed)}")

    # Tamper test
    tampered = {**signed, "name": "HACKER"}
    print(f"Tampered valid: {verify_record(tampered)}")  # expect False
