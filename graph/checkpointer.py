import os
from contextlib import asynccontextmanager

from core.vector_store import setup_vector_store


@asynccontextmanager
async def make_checkpointer():
    setup_vector_store()

    database_url = os.getenv("DATABASE_URL", "")
    if database_url:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from psycopg_pool import AsyncConnectionPool

        async with AsyncConnectionPool(
            database_url, kwargs={"autocommit": True}
        ) as pool:
            saver = AsyncPostgresSaver(pool)
            await saver.setup()
            yield saver
    else:
        from langgraph.checkpoint.memory import MemorySaver
        yield MemorySaver()
