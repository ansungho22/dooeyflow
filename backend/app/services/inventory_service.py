"""재고 차감 핵심 로직.

설계 원칙:
- 정밀도: 모든 수량 계산은 Decimal로 수행 (부동소수점 금지)
- 원자성: 일괄 차감은 하나의 트랜잭션 — 전부 적용되거나 전부 롤백
- 감사: 모든 재고 변동은 inventory_transactions에 reason_code/actor로 기록
- 집계: 여러 메뉴가 같은 원자재를 쓰면 소비량을 합산해 한 번에 차감
"""

from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory_transaction import InventoryTransaction, ReasonCode
from app.models.material import Material
from app.models.menu import Menu
from app.models.recipe import Recipe
from app.schemas.inventory import (
    BatchSaleRequest,
    BatchSaleResult,
    MaterialStockChange,
    StockAdjustment,
)

TRANSACTION_LIST_LIMIT = 100


class DeductionError(Exception):
    """재고 차감 도메인 오류."""


class MenuNotInStore(DeductionError):
    pass


class MaterialNotInStore(DeductionError):
    pass


async def _aggregate_consumption(
    db: AsyncSession, store_id: int, request: BatchSaleRequest
) -> dict[int, Decimal]:
    """판매 라인 → 원자재별 총 소비량(Decimal) 집계.

    메뉴/레시피가 모두 같은 매장 소속인지 검증하며, 위반 시 예외로 전체 차단한다.
    """
    menu_ids = [line.menu_id for line in request.lines]

    # 메뉴 배치 로드 (N+1 방지)
    menu_rows = await db.execute(select(Menu).where(Menu.id.in_(menu_ids)))
    menus: dict[int, Menu] = {m.id: m for m in menu_rows.scalars().all()}

    for line in request.lines:
        menu = menus.get(line.menu_id)
        if menu is None or menu.store_id != store_id:
            raise MenuNotInStore(f"메뉴 {line.menu_id}를 찾을 수 없습니다.")

    # 레시피 배치 로드 (N+1 방지)
    recipe_rows = await db.execute(select(Recipe).where(Recipe.menu_id.in_(menu_ids)))
    recipes = recipe_rows.scalars().all()

    qty_by_menu = {line.menu_id: line.quantity_sold for line in request.lines}
    consumption: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for recipe in recipes:
        # 소비량 = 메뉴당 소모량 × 판매 수량 (Decimal 정밀 연산)
        consumption[recipe.material_id] += recipe.quantity_per_unit * Decimal(
            qty_by_menu[recipe.menu_id]
        )

    return consumption


async def process_batch_sale(
    db: AsyncSession,
    store_id: int,
    actor_id: int | None,
    request: BatchSaleRequest,
    reference: str | None = None,
) -> BatchSaleResult:
    """수동 일괄 판매 입력을 받아 BOM 기반으로 원자재를 일괄 차감한다.

    원자성: 검증 실패 시 어떤 변경도 커밋하지 않는다.
    """
    consumption = await _aggregate_consumption(db, store_id, request)

    # 원자재 배치 로드 (N+1 방지)
    mat_rows = await db.execute(
        select(Material).where(Material.id.in_(list(consumption.keys()))).with_for_update()
    )
    materials: dict[int, Material] = {m.id: m for m in mat_rows.scalars().all()}

    changes: list[MaterialStockChange] = []
    for material_id, consumed in consumption.items():
        material = materials.get(material_id)
        if material is None or material.store_id != store_id:
            raise MaterialNotInStore(f"원자재 {material_id}를 찾을 수 없습니다.")

        material.current_stock = material.current_stock - consumed
        db.add(
            InventoryTransaction(
                store_id=store_id,
                material_id=material_id,
                quantity_changed=-consumed,
                reason_code=ReasonCode.SALE,
                actor_id=actor_id,
                reference=reference,
            )
        )
        changes.append(
            MaterialStockChange(
                material_id=material_id,
                material_name=material.name,
                unit=material.unit,
                consumed=consumed,
                remaining_stock=material.current_stock,
                is_low_stock=material.is_low_stock,
            )
        )

    await db.commit()

    low_stock = [c for c in changes if c.is_low_stock]
    return BatchSaleResult(changes=changes, low_stock_materials=low_stock)


async def adjust_stock(
    db: AsyncSession,
    store_id: int,
    material_id: int,
    actor_id: int,
    adjustment: StockAdjustment,
) -> Material:
    """단일 원자재 수동 보정/폐기 (실사·폐기·취소 복원). 감사 로그를 남긴다."""
    material = await db.get(Material, material_id)
    if material is None or material.store_id != store_id:
        raise MaterialNotInStore(f"원자재 {material_id}를 찾을 수 없습니다.")

    material.current_stock = material.current_stock + adjustment.quantity_changed
    db.add(
        InventoryTransaction(
            store_id=store_id,
            material_id=material_id,
            quantity_changed=adjustment.quantity_changed,
            reason_code=adjustment.reason_code,
            actor_id=actor_id,
        )
    )
    await db.commit()
    await db.refresh(material)
    return material


async def list_transactions(
    db: AsyncSession, store_id: int, material_id: int | None = None
) -> list[InventoryTransaction]:
    """감사 로그 조회 (매장 격리, 선택적으로 원자재 필터)."""
    query = select(InventoryTransaction).where(
        InventoryTransaction.store_id == store_id
    )
    if material_id is not None:
        query = query.where(InventoryTransaction.material_id == material_id)
    query = query.order_by(InventoryTransaction.id.desc()).limit(TRANSACTION_LIST_LIMIT)
    result = await db.execute(query)
    return list(result.scalars().all())
