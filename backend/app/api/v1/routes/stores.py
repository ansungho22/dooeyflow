"""매장 라우터. 현재 사용자의 매장 조회 및 수정."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.store import StoreCreate, StoreRead, StoreUpdate
from app.services import store_service

router = APIRouter(prefix="/stores", tags=["stores"])

DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=StoreRead, status_code=status.HTTP_201_CREATED)
async def create_store(
    payload: StoreCreate, user: CurrentUser, db: DbSession
) -> StoreRead:
    """새 매장을 생성한다."""
    store = await store_service.create_store(db, user.id, payload)
    return StoreRead.model_validate(store)


@router.get("", response_model=list[StoreRead])
async def list_stores(user: CurrentUser, db: DbSession) -> list[StoreRead]:
    """현재 사용자의 모든 매장 목록을 조회한다."""
    stores = await store_service.list_stores(db, user.id)
    return [StoreRead.model_validate(s) for s in stores]


@router.get("/{store_id}", response_model=StoreRead)
async def get_store(store_id: int, user: CurrentUser, db: DbSession) -> StoreRead:
    """특정 매장 정보를 조회한다."""
    try:
        store = await store_service.get_store(db, user.id, store_id)
    except store_service.StoreNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return StoreRead.model_validate(store)


@router.patch("/{store_id}", response_model=StoreRead)
async def update_store(
    store_id: int, payload: StoreUpdate, user: CurrentUser, db: DbSession
) -> StoreRead:
    """매장 정보를 수정한다."""
    try:
        store = await store_service.update_store(db, user.id, store_id, payload)
    except store_service.StoreNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return StoreRead.model_validate(store)
