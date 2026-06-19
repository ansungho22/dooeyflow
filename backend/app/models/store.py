"""매장 모델. 모든 도메인 데이터의 멀티테넌시 격리 기준."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Store(Base, TimestampMixin):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    # 토스 POS 연동 사용 여부 (False면 수동 관리 모드)
    toss_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)

    owner: Mapped["User"] = relationship(back_populates="stores")  # noqa: F821
