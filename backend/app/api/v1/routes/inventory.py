"""재고 차감/조정/감사로그 라우터."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, OwnedStore
from app.core.database import get_db
from app.schemas.inventory import (
    BatchSaleRequest,
    BatchSaleResult,
    InventoryTransactionRead,
    StockAdjustment,
)
from app.schemas.material import MaterialRead
from app.services import inventory_service

router = APIRouter(prefix="/stores/{store_id}/inventory", tags=["inventory"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/batch-sale", response_model=BatchSaleResult)
async def batch_sale(
    payload: BatchSaleRequest,
    store: OwnedStore,
    current_user: CurrentUser,
    db: DbSession,
) -> BatchSaleResult:
    """수동 일괄 판매 입력 → BOM 기반 원자재 일괄 차감."""
    try:
        return await inventory_service.process_batch_sale(
            db, store.id, current_user.id, payload
        )
    except inventory_service.DeductionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post("/materials/{material_id}/adjust", response_model=MaterialRead)
async def adjust_stock(
    material_id: int,
    payload: StockAdjustment,
    store: OwnedStore,
    current_user: CurrentUser,
    db: DbSession,
) -> MaterialRead:
    """수동 재고 보정/폐기 (실사·폐기·취소 복원)."""
    try:
        material = await inventory_service.adjust_stock(
            db, store.id, material_id, current_user.id, payload
        )
    except inventory_service.MaterialNotInStore as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    return MaterialRead.model_validate(material)


@router.get("/transactions", response_model=list[InventoryTransactionRead])
async def list_transactions(
    store: OwnedStore,
    db: DbSession,
    material_id: int | None = None,
) -> list[InventoryTransactionRead]:
    """재고 변동 감사 로그 조회."""
    txns = await inventory_service.list_transactions(db, store.id, material_id)
    return [InventoryTransactionRead.model_validate(t) for t in txns]
