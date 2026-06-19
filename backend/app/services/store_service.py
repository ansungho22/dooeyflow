"""매장 비즈니스 로직. 소유자 검증 후 조회/수정."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.store import Store
from app.schemas.store import StoreUpdate


class StoreNotFound(Exception):
    pass


async def get_store(db: AsyncSession, owner_id: int, store_id: int) -> Store:
    """소유자가 일치하는 매장을 조회한다."""
    result = await db.execute(
        select(Store).where(Store.id == store_id, Store.owner_id == owner_id)
    )
    store = result.scalar_one_or_none()
    if store is None:
        raise StoreNotFound("매장을 찾을 수 없습니다.")
    return store


async def list_stores(db: AsyncSession, owner_id: int) -> list[Store]:
    """소유자의 모든 매장 목록을 조회한다."""
    result = await db.execute(
        select(Store).where(Store.owner_id == owner_id).order_by(Store.name)
    )
    return list(result.scalars().all())


async def update_store(
    db: AsyncSession, owner_id: int, store_id: int, payload: StoreUpdate
) -> Store:
    """매장 정보를 수정한다."""
    store = await get_store(db, owner_id, store_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(store, field, value)
    await db.commit()
    await db.refresh(store)
    return store
