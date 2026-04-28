import os
from contextlib import asynccontextmanager
import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sorabbyngo:sorabbyngo@postgres:5432/novela")

@asynccontextmanager
async def get_conn():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()
