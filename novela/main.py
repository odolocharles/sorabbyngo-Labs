"""Novela — Patient & Staff management microservice."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db import init_pool, close_pool
from staff import router as staff_router
from billing import router as billing_router
from appointments import router as appt_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(
    title="Novela — Sorabbyngo Patient & Staff API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(staff_router)
app.include_router(billing_router)
app.include_router(appt_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "novela"}
