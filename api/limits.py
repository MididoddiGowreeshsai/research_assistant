import asyncio
import os
from collections import defaultdict
from datetime import date
from typing import AsyncGenerator

from fastapi import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}

DAILY_CAP = int(os.getenv("DAILY_RESEARCH_CAP", "40"))

_daily_counts: dict = defaultdict(int)
_count_date: date = date.today()


def _reset_if_new_day() -> None:
    global _count_date
    today = date.today()
    if today != _count_date:
        _daily_counts.clear()
        _count_date = today


def check_daily_quota(client_ip: str) -> None:
    _reset_if_new_day()
    if sum(_daily_counts.values()) >= DAILY_CAP:
        raise HTTPException(
            status_code=429,
            detail="Daily research limit reached. Try again tomorrow.",
        )
    _daily_counts[client_ip] += 1


def validate_topic(topic: str) -> None:
    stripped = topic.strip()
    if not stripped:
        raise HTTPException(status_code=422, detail="Topic cannot be empty.")
    if len(stripped) > 200:
        raise HTTPException(
            status_code=422, detail="Topic must be 200 characters or fewer."
        )


async def with_heartbeat(
    agen: AsyncGenerator[str, None], interval: float = 15
) -> AsyncGenerator[str, None]:
    """Yield ': ping\\n\\n' when silent for `interval` seconds.

    Runs the inner generator in a background task feeding a queue so it is
    never cancelled by asyncio.wait_for — only the queue.get() times out.
    """
    queue: asyncio.Queue = asyncio.Queue()

    async def _feed() -> None:
        try:
            async for chunk in agen:
                await queue.put(chunk)
        except Exception as exc:  # noqa: BLE001
            await queue.put(exc)
        finally:
            await queue.put(None)  # sentinel

    task = asyncio.create_task(_feed())
    try:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=interval)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            yield item
    finally:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
