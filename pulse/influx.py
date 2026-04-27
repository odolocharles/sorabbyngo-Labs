"""Pulse — InfluxDB writer and query helper."""
import os
from typing import Optional
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import ASYNCHRONOUS

INFLUX_URL = os.getenv("INFLUX_URL", "http://localhost:8086")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN", "sorabbyngo-token")
INFLUX_ORG = os.getenv("INFLUX_ORG", "sorabbyngo")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "vitals")

_client: InfluxDBClient | None = None


def get_client() -> InfluxDBClient:
    global _client
    if _client is None:
        _client = InfluxDBClient(
            url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG
        )
    return _client


async def write_vitals(reading) -> None:
    client = get_client()
    write_api = client.write_api(write_options=ASYNCHRONOUS)
    point = (
        Point("vitals")
        .tag("patient_id", reading.patient_id)
        .tag("ward", reading.ward)
        .tag("device_id", reading.device_id or "manual")
        .tag("alert_level", reading.alert_level or "green")
    )
    for field in ["heart_rate", "systolic_bp", "diastolic_bp",
                  "spo2", "temperature", "respiratory_rate", "news2_score"]:
        val = getattr(reading, field, None)
        if val is not None:
            point = point.field(field, float(val))

    if reading.consciousness:
        point = point.field("consciousness", reading.consciousness)

    point = point.time(reading.timestamp, WritePrecision.MILLISECONDS)
    write_api.write(bucket=INFLUX_BUCKET, record=point)


async def query_vitals(
    patient_id: Optional[str] = None,
    ward: Optional[str] = None,
    hours: int = 24,
) -> list[dict]:
    client = get_client()
    query_api = client.query_api()

    filters = []
    if patient_id:
        filters.append(f'r["patient_id"] == "{patient_id}"')
    if ward:
        filters.append(f'r["ward"] == "{ward}"')

    filter_str = " and ".join(filters) if filters else "true"

    flux = f"""
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: -{hours}h)
      |> filter(fn: (r) => r["_measurement"] == "vitals")
      |> filter(fn: (r) => {filter_str})
      |> pivot(rowKey:["_time","patient_id","ward"], columnKey:["_field"], valueColumn:"_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 500)
    """
    tables = query_api.query(flux)
    results = []
    for table in tables:
        for record in table.records:
            results.append({**record.values, "timestamp": record.get_time().isoformat()})
    return results
