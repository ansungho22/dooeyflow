"""토스 폴링 트리거 라우터 (수동/스케줄러 호출용)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import OwnedStore
from app.core.database import get_db
from app.core.idempotency import IdempotencyStore, get_idempotency_store
from app.services import polling_service
from app.services.toss_client import TossClient, get_toss_client

router = APIRouter(prefix="/stores/{store_id}/toss", tags=["toss-polling"])

DbSession = Annotated[AsyncSession, Depends(get_db)]
Idempotency = Annotated[IdempotencyStore, Depends(get_idempotency_store)]
Client = Annotated[TossClient, Depends(get_toss_client)]


class PollingResponse(BaseModel):
    fetched: int
    processed: int
    duplicate: int


@router.post("/poll", response_model=PollingResponse)
async def trigger_polling(
    store: OwnedStore,
    db: DbSession,
    idempotency: Idempotency,
    client: Client,
) -> PollingResponse:
    """토스 누락 주문을 조회·후속 처리한다 (정합성 교차 검증)."""
    summary = await polling_service.run_polling(db, idempotency, client, store.id)
    return PollingResponse(
        fetched=summary.fetched,
        processed=summary.processed,
        duplicate=summary.duplicate,
    )
