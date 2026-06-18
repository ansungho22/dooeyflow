"""판매 메뉴 모델."""

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Menu(Base, TimestampMixin):
    __tablename__ = "menus"

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    # 토스 POS 메뉴 식별자 (자동 차감 매핑용)
    pos_menu_code: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)

    recipes: Mapped[list["Recipe"]] = relationship(  # noqa: F821
        back_populates="menu", cascade="all, delete-orphan"
    )
