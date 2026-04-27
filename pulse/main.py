"""Pulse — Ward vitals monitoring microservice."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .vitals import router as vitals_router
from .devices import router as devices_router
from .ws import router as ws_router


app = FastAPI(title="Pulse — Sorabbyngo Ward Monitor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vitals_router)
app.include_router(devices_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pulse"}
