"""토스 OpenAPI 클라이언트 추상화.

실제 토스 API 연동은 자격증명·엔드포인트가 필요하므로 Protocol 뒤에 둔다.
폴링 로직은 이 추상화에만 의존하므로 외부 호출 없이 테스트할 수 있다.
운영에서는 HTTP 구현으로 교체한다.
"""

from typing import Protocol

from app.schemas.webhook import TossWebhookPayload


class TossClient(Protocol):
    async def fetch_recent_orders(self, store_id: int) -> list[TossWebhookPayload]:
        """매장의 최근 주문을 토스 API에서 조회한다."""
        ...


class StubTossClient:
    """기본 스텁: 빈 목록 반환 (실연동 전까지 폴링은 무동작)."""

    async def fetch_recent_orders(self, store_id: int) -> list[TossWebhookPayload]:
        return []


def get_toss_client() -> TossClient:
    """FastAPI 의존성: 기본 토스 클라이언트."""
    return StubTossClient()
