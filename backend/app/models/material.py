"""원자재/식자재 모델. 재고 수량은 DECIMAL(12,4)로 부동소수점 오차를 방지한다."""

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

# 재고 수량 정밀도: 핵심 도메인 규칙
QUANTITY_PRECISION = 12
QUANTITY_SCALE = 4


class Material(Base, TimestampMixin):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # 예: g, ml, 개
    current_stock: Mapped[Decimal] = mapped_column(
        Numeric(QUANTITY_PRECISION, QUANTITY_SCALE), default=Decimal("0"), nullable=False
    )
    safety_stock: Mapped[Decimal] = mapped_column(
        Numeric(QUANTITY_PRECISION, QUANTITY_SCALE), default=Decimal("0"), nullable=False
    )
