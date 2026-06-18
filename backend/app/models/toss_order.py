"""토스 주문 처리 내역. 웹훅/폴링 이중 처리 방지 및 교차 검증용."""

import enum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class OrderSource(str, enum.Enum):
    WEBHOOK = "WEBHOOK"
    POLLING = "POLLING"


class TossOrder(Base, TimestampMixin):
    __tablename__ = "toss_orders"
    __table_args__ = (
        # 동일 매장 내 주문 중복 처리 방지 (멱등성의 DB 레벨 안전망)
        UniqueConstraint("store_id", "order_id", name="uq_toss_order_store_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # 토스가 부여한 주문 식별자 (멱등성 키의 근거)
    order_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    source: Mapped[OrderSource] = mapped_column(
        SAEnum(OrderSource, name="order_source"), nullable=False
    )
    processed: Mapped[bool] = mapped_column(default=False, nullable=False)
