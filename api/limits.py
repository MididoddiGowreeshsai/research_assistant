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
    """Yield ': ping\\n\\n' whenever the inner generator is silent for `interval` seconds."""
    aiter = agen.__aiter__()
    while True:
        try:
            chunk = await asyncio.wait_for(aiter.__anext__(), timeout=interval)
            yield chunk
        except StopAsyncIteration:
            break
        except asyncio.TimeoutError:
            yield ": ping\n\n"
