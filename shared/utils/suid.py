"""SUID — Sorabbyngo Unique Identifier generator (wraps identity-core format)."""
import uuid
import hashlib
import time
import base64


def generate_suid(prefix: str = "SRB") -> str:
    """
    Generate a SUID in the format: SRB-<timestamp_b32>-<uuid_fragment>
    Designed to be sortable, URL-safe, and collision-resistant.
    """
    ts = int(time.time() * 1000)
    ts_b32 = base64.b32encode(ts.to_bytes(6, "big")).decode().rstrip("=").lower()
    uid_frag = str(uuid.uuid4()).replace("-", "")[:8]
    return f"{prefix}-{ts_b32}-{uid_frag}"


def suid_to_patient_id(suid: str) -> str:
    """Derive a stable patient_id hash from a SUID."""
    return hashlib.sha256(suid.encode()).hexdigest()[:16]


def validate_suid(suid: str) -> bool:
    """Validate SUID format."""
    parts = suid.split("-")
    if len(parts) != 3:
        return False
    prefix, ts_part, uid_part = parts
    return (
        len(prefix) >= 2
        and len(ts_part) == 10
        and len(uid_part) == 8
    )


if __name__ == "__main__":
    s = generate_suid()
    print(f"SUID:       {s}")
    print(f"Valid:      {validate_suid(s)}")
    print(f"Patient ID: {suid_to_patient_id(s)}")
