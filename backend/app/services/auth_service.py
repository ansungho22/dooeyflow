"""인증/온보딩 비즈니스 로직. 라우터는 얇게 유지하고 여기에 영속·검증을 둔다."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.store import Store
from app.models.user import User
from app.schemas.auth import StoreCreate, UserCreate


class AuthError(Exception):
    """인증/온보딩 도메인 오류."""


class EmailAlreadyExists(AuthError):
    pass


class InvalidCredentials(AuthError):
    pass


async def register_user(db: AsyncSession, payload: UserCreate) -> User:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise EmailAlreadyExists("이미 가입된 이메일입니다.")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentials("이메일 또는 비밀번호가 올바르지 않습니다.")
    if not user.is_active:
        raise InvalidCredentials("비활성화된 계정입니다.")
    return user


async def create_store(db: AsyncSession, owner: User, payload: StoreCreate) -> Store:
    store = Store(owner_id=owner.id, name=payload.name, toss_enabled=payload.toss_enabled)
    db.add(store)
    await db.commit()
    await db.refresh(store)
    return store


async def list_stores(db: AsyncSession, owner: User) -> list[Store]:
    result = await db.execute(select(Store).where(Store.owner_id == owner.id))
    return list(result.scalars().all())
