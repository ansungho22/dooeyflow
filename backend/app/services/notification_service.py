"""안전재고 푸시 알림.

발송 채널(APNs/Web Push)은 자격증명·외부 SDK가 필요하므로 Sender 추상화
뒤에 둔다. 운영에서는 실제 발송 구현으로 교체하고, 기본은 로깅 발송이다.
이렇게 하면 부족 감지→알림 디스패치 로직을 외부 의존성 없이 테스트할 수 있다.
"""

import logging
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device_token import DevicePlatform, DeviceToken
from app.schemas.inventory import MaterialStockChange
from app.schemas.notification import DeviceTokenCreate, PushMessage

logger = logging.getLogger("dooeyflow.notification")


class PushSender(Protocol):
    async def send(self, token: DeviceToken, message: PushMessage) -> bool:
        """단일 디바이스로 푸시를 발송한다. 성공 여부 반환."""
        ...


class LoggingPushSender:
    """기본 발송기: 실제 전송 대신 로그만 남긴다 (운영 시 교체)."""

    async def send(self, token: DeviceToken, message: PushMessage) -> bool:
        logger.info(
            "push -> platform=%s token=%s title=%s",
            token.platform.value,
            token.token[:8],
            message.title,
        )
        return True


async def register_device_token(
    db: AsyncSession, store_id: int, user_id: int, payload: DeviceTokenCreate
) -> DeviceToken:
    """디바이스 토큰을 등록한다. 동일 토큰 재등록 시 활성화/소유 갱신(upsert)."""
    existing = await db.execute(
        select(DeviceToken).where(DeviceToken.token == payload.token)
    )
    token = existing.scalar_one_or_none()
    if token is not None:
        token.store_id = store_id
        token.user_id = user_id
        token.platform = payload.platform
        token.is_active = True
    else:
        token = DeviceToken(
            store_id=store_id,
            user_id=user_id,
            platform=payload.platform,
            token=payload.token,
            is_active=True,
        )
        db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def list_active_tokens(db: AsyncSession, store_id: int) -> list[DeviceToken]:
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.store_id == store_id, DeviceToken.is_active.is_(True)
        )
    )
    return list(result.scalars().all())


def build_low_stock_message(materials: list[MaterialStockChange]) -> PushMessage:
    """부족 원자재 목록으로 알림 메시지를 구성한다."""
    names = ", ".join(m.material_name for m in materials)
    count = len(materials)
    return PushMessage(
        title="재고 부족 알림",
        body=f"{count}개 원자재가 안전재고 이하입니다: {names}",
    )


async def send_to_tokens(
    tokens: list[DeviceToken], message: PushMessage, sender: PushSender
) -> int:
    """이미 로드된 토큰 목록으로 발송한다 (DB 불필요 → 백그라운드 태스크 안전).

    반환: 발송 성공 건수.
    """
    sent = 0
    for token in tokens:
        try:
            if await sender.send(token, message):
                sent += 1
        except Exception:  # noqa: BLE001 - 한 기기 실패가 전체를 막지 않도록
            logger.exception("푸시 발송 실패 token_id=%s", token.id)
    return sent


async def dispatch_low_stock_alert(
    db: AsyncSession,
    store_id: int,
    low_stock: list[MaterialStockChange],
    sender: PushSender,
) -> int:
    """부족 원자재에 대해 매장의 모든 활성 디바이스로 알림을 발송한다 (DB 조회 포함).

    반환: 발송 성공 건수.
    """
    if not low_stock:
        return 0
    tokens = await list_active_tokens(db, store_id)
    if not tokens:
        return 0
    message = build_low_stock_message(low_stock)
    return await send_to_tokens(tokens, message, sender)


# 플랫폼별 발송기 매핑 (현재는 모두 로깅 발송기, 운영 시 교체)
_SENDERS: dict[DevicePlatform, PushSender] = {
    DevicePlatform.IOS: LoggingPushSender(),
    DevicePlatform.WEB: LoggingPushSender(),
}


def get_push_sender() -> PushSender:
    """FastAPI 의존성: 기본 푸시 발송기."""
    return LoggingPushSender()
