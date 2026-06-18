"""레시피 모델 (BOM): 메뉴-원자재 소모량 매핑 + 조리 매뉴얼."""

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.material import QUANTITY_PRECISION, QUANTITY_SCALE


class Recipe(Base, TimestampMixin):
    """메뉴 1개 판매 시 소모되는 원자재와 수량을 정의한다."""

    __tablename__ = "recipes"
    __table_args__ = (
        # 동일 메뉴-원자재 조합 중복 방지
        UniqueConstraint("menu_id", "material_id", name="uq_recipe_menu_material"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True, nullable=False
    )
    menu_id: Mapped[int] = mapped_column(
        ForeignKey("menus.id", ondelete="CASCADE"), index=True, nullable=False
    )
    material_id: Mapped[int] = mapped_column(
        ForeignKey("materials.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    # 메뉴 1개당 소모량 (예: 우유 150ml, 원두 18g)
    quantity_per_unit: Mapped[Decimal] = mapped_column(
        Numeric(QUANTITY_PRECISION, QUANTITY_SCALE), nullable=False
    )
    # 조리 매뉴얼 (직원 참고용)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    menu: Mapped["Menu"] = relationship(back_populates="recipes")  # noqa: F821
