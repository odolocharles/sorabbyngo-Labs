"""Novela async database core — connection pool, base repo, migrations helper."""
import os
from typing import AsyncGenerator
import asyncpg
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sorabbyngo:sorabbyngo@localhost:5432/novela"
)

_pool: asyncpg.Pool | None = None


async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=20,
        command_timeout=30,
    )


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    if _pool is None:
        await init_pool()
    async with _pool.acquire() as conn:
        yield conn


class BaseRepo:
    """Thin repository base with common CRUD helpers."""

    def __init__(self, table: str):
        self.table = table

    async def find_by_id(self, row_id: str) -> dict | None:
        async with get_conn() as conn:
            row = await conn.fetchrow(
                f"SELECT * FROM {self.table} WHERE id = $1", row_id
            )
            return dict(row) if row else None

    async def find_all(self, limit: int = 100, offset: int = 0) -> list[dict]:
        async with get_conn() as conn:
            rows = await conn.fetch(
                f"SELECT * FROM {self.table} LIMIT $1 OFFSET $2", limit, offset
            )
            return [dict(r) for r in rows]

    async def delete(self, row_id: str) -> bool:
        async with get_conn() as conn:
            result = await conn.execute(
                f"DELETE FROM {self.table} WHERE id = $1", row_id
            )
            return result == "DELETE 1"
