import os
from contextlib import asynccontextmanager

from core.vector_store import setup_vector_store


@asynccontextmanager
async def make_checkpointer():
    setup_vector_store()

    database_url = os.getenv("DATABASE_URL", "")
    if database_url:
        from psycopg.rows import dict_row
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from psycopg_pool import AsyncConnectionPool

        # min_size=0: no idle connections (saves Neon's connection quota on free tier)
        # max_size=3: conservative ceiling for Neon free tier
        # prepare_threshold=0: disable server-side prepared statements (Neon-safe)
        # autocommit=True: required by LangGraph's checkpointer
        async with AsyncConnectionPool(
            database_url,
            min_size=0,
            max_size=3,
            kwargs={
                "autocommit": True,
                "prepare_threshold": 0,
                "row_factory": dict_row,
            },
        ) as pool:
            saver = AsyncPostgresSaver(pool)
            await saver.setup()
            yield saver
    else:
        from langgraph.checkpoint.memory import MemorySaver
        yield MemorySaver()
