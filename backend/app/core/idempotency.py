"""멱등성 저장소 추상화.

운영에서는 Redis SETNX로 orderId 기반 멱등성 키를 관리하고,
테스트에서는 인메모리 구현으로 대체한다 (Redis 불필요).
"""

from typing import Protocol

import redis.asyncio as aioredis

from app.core.config import settings

# 멱등성 키 TTL (초). 웹훅/폴링 중복 윈도우를 충분히 덮는다.
IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24


class IdempotencyStore(Protocol):
    async def acquire(self, key: str) -> bool:
        """키를 선점한다. 처음이면 True, 이미 처리됐으면 False."""
        ...


class RedisIdempotencyStore:
    """Redis SETNX 기반 멱등성 저장소."""

    def __init__(self, client: aioredis.Redis) -> None:
        self._client = client

    async def acquire(self, key: str) -> bool:
        # SET key value NX EX ttl → 최초 1회만 성공
        result = await self._client.set(
            f"idem:{key}", "1", nx=True, ex=IDEMPOTENCY_TTL_SECONDS
        )
        return bool(result)


_redis_client: aioredis.Redis | None = None


def _get_client() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


async def get_idempotency_store() -> IdempotencyStore:
    """FastAPI 의존성: 운영용 Redis 멱등성 저장소."""
    return RedisIdempotencyStore(_get_client())
