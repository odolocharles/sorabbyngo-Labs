"""Pulse — Ward WebSocket: real-time vitals broadcast with heartbeat."""
import asyncio
import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

# ward_id -> set of connected websockets
_ward_connections: Dict[str, Set[WebSocket]] = {}
HEARTBEAT_INTERVAL = 30  # seconds


class ConnectionManager:
    def connect(self, ward: str, ws: WebSocket):
        _ward_connections.setdefault(ward, set()).add(ws)

    def disconnect(self, ward: str, ws: WebSocket):
        if ward in _ward_connections:
            _ward_connections[ward].discard(ws)
            if not _ward_connections[ward]:
                del _ward_connections[ward]

    async def broadcast(self, ward: str, message: dict):
        dead = set()
        for ws in _ward_connections.get(ward, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(ward, ws)

    def ward_count(self, ward: str) -> int:
        return len(_ward_connections.get(ward, set()))


manager = ConnectionManager()


async def _heartbeat(ws: WebSocket, ward: str):
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await ws.send_json({"type": "ping", "ward": ward})
    except Exception:
        pass


@router.websocket("/ws/vitals/{ward}")
async def ward_vitals_ws(ward: str, websocket: WebSocket):
    await websocket.accept()
    manager.connect(ward, websocket)
    hb_task = asyncio.create_task(_heartbeat(websocket, ward))
    try:
        await websocket.send_json({
            "type": "connected",
            "ward": ward,
            "listeners": manager.ward_count(ward),
        })
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "pong":
                continue
            # Clients can push vitals through the WS too
            if msg.get("type") == "vitals":
                await manager.broadcast(ward, {**msg, "ward": ward})
    except WebSocketDisconnect:
        pass
    finally:
        hb_task.cancel()
        manager.disconnect(ward, websocket)


async def push_to_ward(ward: str, vitals_dict: dict):
    """Called by vitals API after writing to InfluxDB."""
    await manager.broadcast(ward, {"type": "vitals", **vitals_dict})
