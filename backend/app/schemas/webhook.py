"""토스 웹훅 요청·응답 스키마."""

from pydantic import BaseModel, Field


class TossOrderItem(BaseModel):
    """주문 항목: POS 메뉴 코드 + 수량."""

    pos_menu_code: str
    quantity: int = Field(gt=0)


class TossWebhookPayload(BaseModel):
    """토스 주문 완료 웹훅 페이로드."""

    order_id: str = Field(min_length=1)
    store_id: int
    items: list[TossOrderItem] = Field(min_length=1)


class WebhookAck(BaseModel):
    """웹훅 처리 결과 ACK."""

    order_id: str
    status: str  # processed | duplicate | unknown_menu_skipped
