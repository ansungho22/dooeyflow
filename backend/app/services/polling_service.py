"""토스 폴링 배치.

웹훅이 네트워크 장애 등으로 유실됐을 때를 대비해 주기적으로 토스 API를 조회하고
누락 주문을 후속 처리한다. 웹훅과 동일한 멱등 처리(process_webhook)를 재사용하므로
이미 처리된 주문은 채널과 무관하게 이중 차감되지 않는다.
"""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.idempotency import IdempotencyStore
from app.models.toss_order import OrderSource
from app.services import webhook_service
from app.services.toss_client import TossClient


@dataclass(frozen=True)
class PollingSummary:
    fetched: int
    processed: int
    duplicate: int


async def run_polling(
    db: AsyncSession,
    idempotency: IdempotencyStore,
    client: TossClient,
    store_id: int,
) -> PollingSummary:
    """매장의 최근 주문을 조회해 누락분을 멱등하게 후속 처리한다."""
    orders = await client.fetch_recent_orders(store_id)

    processed = 0
    duplicate = 0
    for order in orders:
        try:
            await webhook_service.process_webhook(
                db, idempotency, order, source=OrderSource.POLLING
            )
            processed += 1
        except webhook_service.DuplicateOrder:
            # 웹훅 또는 이전 폴링에서 이미 처리됨 → 정상 (이중 차감 방지)
            duplicate += 1

    return PollingSummary(
        fetched=len(orders), processed=processed, duplicate=duplicate
    )
