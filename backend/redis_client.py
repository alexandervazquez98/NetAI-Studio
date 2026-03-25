import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import redis.asyncio as redis

from backend.config import settings

logger = logging.getLogger(__name__)

_redis_pool: redis.ConnectionPool | None = None


def _get_pool() -> redis.ConnectionPool:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


@asynccontextmanager
async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    """Async context manager that yields a Redis connection from the pool."""
    client = redis.Redis(connection_pool=_get_pool())
    try:
        yield client
    finally:
        await client.aclose()


async def publish_message(channel: str, message: dict) -> None:
    """JSON-serialize and publish a message to a Redis channel."""
    try:
        async with get_redis() as r:
            await r.publish(channel, json.dumps(message, default=str))
    except Exception as exc:
        logger.error("Failed to publish to channel '%s': %s", channel, exc)


async def subscribe_channel(channel: str) -> AsyncGenerator[dict, None]:
    """
    Async generator that yields parsed messages from a Redis pub/sub channel.
    Yields dicts for 'message' type events only; ignores subscribe confirmations.
    """
    client = redis.Redis(connection_pool=_get_pool())
    pubsub = client.pubsub()
    try:
        await pubsub.subscribe(channel)
        logger.debug("Subscribed to Redis channel: %s", channel)
        async for raw in pubsub.listen():
            if raw["type"] == "message":
                try:
                    yield json.loads(raw["data"])
                except json.JSONDecodeError:
                    yield {"raw": raw["data"]}
    except Exception as exc:
        logger.error("Error in subscribe_channel '%s': %s", channel, exc)
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
        except Exception:
            pass
        await client.aclose()
