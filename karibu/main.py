"""Karibu — Community & Maternal Health microservice."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chw import router as chw_router
from anc import router as anc_router


app = FastAPI(title="Karibu — Community & Maternal Health", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chw_router)
app.include_router(anc_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "karibu"}
