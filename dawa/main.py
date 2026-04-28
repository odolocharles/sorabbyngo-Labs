"""Dawa — Pharmacy & Supply Chain microservice."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from forecasting import router as forecast_router


app = FastAPI(title="Dawa — Pharmacy & Supply Chain", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "dawa"}
