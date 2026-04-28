import uuid, hashlib, time, base64

def generate_suid(prefix="SRB"):
    ts = int(time.time() * 1000)
    ts_b32 = base64.b32encode(ts.to_bytes(6, "big")).decode().rstrip("=").lower()
    uid_frag = str(uuid.uuid4()).replace("-", "")[:8]
    return f"{prefix}-{ts_b32}-{uid_frag}"

def suid_to_patient_id(suid):
    return hashlib.sha256(suid.encode()).hexdigest()[:16]
