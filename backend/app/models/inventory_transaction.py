"""재고 변동 감사 로그. 누가/언제/무엇을/왜 변경했는지 전량 추적한다."""

import enum
from decimal import Decimal

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.material import QUANTITY_PRECISION, QUANTITY_SCALE


class ReasonCode(str, enum.Enum):
    """재고 변동 사유 코드 (핵심 도메인 규칙)."""

    SALE = "SALE"  # 판매에 따른 차감
    WASTE = "WASTE"  # 폐기
    AUDIT = "AUDIT"  # 실사 보정
    CANCEL = "CANCEL"  # 주문 취소에 따른 복원


class InventoryTransaction(Base, TimestampMixin):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True, nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        ForeignKey("materials.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # 변동량 (음수=차감, 양수=증가)
    quantity_changed: Mapped[Decimal] = mapped_column(
        Numeric(QUANTITY_PRECISION, QUANTITY_SCALE), nullable=False
    )
    reason_code: Mapped[ReasonCode] = mapped_column(
        SAEnum(ReasonCode, name="reason_code"), nullable=False
    )
    # 변동을 일으킨 주체 (사용자 id 또는 시스템 식별자)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # 연관 주문 등 외부 참조 (예: 토스 orderId)
    reference: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
