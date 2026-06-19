"""사장님 계정 모델."""

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """사용자 계정. 이메일+비밀번호 또는 소셜 로그인으로 가입 가능."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("auth_provider", "auth_provider_id", name="uq_users_provider"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # 소셜 로그인 정보 (null이면 이메일 로그인 사용자)
    auth_provider: Mapped[str | None] = mapped_column(String(20), nullable=True)  # apple, kakao, naver
    auth_provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    stores: Mapped[list["Store"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
