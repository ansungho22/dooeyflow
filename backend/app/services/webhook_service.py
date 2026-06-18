"""토스 웹훅 처리: 멱등성 보장 + POS 메뉴 매핑 + 자동 재고 차감."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.idempotency import IdempotencyStore
from app.models.menu import Menu
from app.models.toss_order import OrderSource, TossOrder
from app.schemas.inventory import BatchSaleRequest, SaleLine
from app.schemas.webhook import TossWebhookPayload
from app.services import inventory_service

# 시스템(웹훅)에 의한 변동은 사용자 actor가 없으므로 None 처리
_SYSTEM_ACTOR: None = None


class DuplicateOrder(Exception):
    pass


async def _map_items_to_sale_lines(
    db: AsyncSession, store_id: int, payload: TossWebhookPayload
) -> list[SaleLine]:
    """POS 메뉴 코드를 매장 메뉴로 매핑한다. 매핑 안 되는 코드는 건너뛴다."""
    lines: list[SaleLine] = []
    for item in payload.items:
        result = await db.execute(
            select(Menu).where(
                Menu.store_id == store_id, Menu.pos_menu_code == item.pos_menu_code
            )
        )
        menu = result.scalar_one_or_none()
        if menu is None:
            # 미등록 메뉴 코드는 차감 대상에서 제외 (전체 실패시키지 않음)
            continue
        lines.append(SaleLine(menu_id=menu.id, quantity_sold=item.quantity))
    return lines


async def process_webhook(
    db: AsyncSession,
    idempotency: IdempotencyStore,
    payload: TossWebhookPayload,
    source: OrderSource = OrderSource.WEBHOOK,
) -> str:
    """웹훅을 멱등하게 처리한다.

    반환: 처리 상태 문자열 (processed | duplicate | unknown_menu_skipped)
    """
    idem_key = f"{payload.store_id}:{payload.order_id}"

    # 1차 방어: Redis 멱등성 키 선점 (동시/중복 수신 차단)
    if not await idempotency.acquire(idem_key):
        raise DuplicateOrder("이미 처리된 주문입니다.")

    # 2차 방어: DB 유니크 (store_id, order_id) — Redis 유실 대비 안전망
    existing = await db.execute(
        select(TossOrder).where(
            TossOrder.store_id == payload.store_id,
            TossOrder.order_id == payload.order_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise DuplicateOrder("이미 처리된 주문입니다.")

    lines = await _map_items_to_sale_lines(db, payload.store_id, payload)

    order = TossOrder(
        store_id=payload.store_id,
        order_id=payload.order_id,
        source=source,
        processed=bool(lines),
    )
    db.add(order)

    if not lines:
        # 매핑되는 메뉴가 하나도 없으면 주문만 기록하고 차감은 생략
        await db.commit()
        return "unknown_menu_skipped"

    await inventory_service.process_batch_sale(
        db,
        store_id=payload.store_id,
        actor_id=_SYSTEM_ACTOR,
        request=BatchSaleRequest(lines=lines),
        reference=payload.order_id,
    )
    return "processed"
