"""디바이스 토큰 등록 라우터 (푸시 알림 수신용)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, OwnedStore
from app.core.database import get_db
from app.schemas.notification import DeviceTokenCreate, DeviceTokenRead
from app.services import notification_service

router = APIRouter(prefix="/stores/{store_id}/device-tokens", tags=["notifications"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("", response_model=DeviceTokenRead, status_code=status.HTTP_201_CREATED)
async def register_device_token(
    payload: DeviceTokenCreate,
    store: OwnedStore,
    current_user: CurrentUser,
    db: DbSession,
) -> DeviceTokenRead:
    """현재 기기의 푸시 토큰을 등록한다 (iOS=APNs, web=Web Push)."""
    token = await notification_service.register_device_token(
        db, store.id, current_user.id, payload
    )
    return DeviceTokenRead.model_validate(token)


@router.get("", response_model=list[DeviceTokenRead])
async def list_device_tokens(store: OwnedStore, db: DbSession) -> list[DeviceTokenRead]:
    tokens = await notification_service.list_active_tokens(db, store.id)
    return [DeviceTokenRead.model_validate(t) for t in tokens]
