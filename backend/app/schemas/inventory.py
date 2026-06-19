"""재고 차감/조정 요청·응답 스키마."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.inventory_transaction import ReasonCode


class SaleLine(BaseModel):
    """일괄 판매 입력의 한 줄: 메뉴와 판매 수량."""

    menu_id: int
    quantity_sold: int = Field(gt=0)


class BatchSaleRequest(BaseModel):
    """수동 일괄 판매 입력 (장사 마감 후 메뉴별 판매량)."""

    lines: list[SaleLine] = Field(min_length=1)


class MaterialStockChange(BaseModel):
    """차감 결과: 원자재별 변동 내역."""

    material_id: int
    material_name: str
    consumed: Decimal
    remaining_stock: Decimal
    is_low_stock: bool


class BatchSaleResult(BaseModel):
    """일괄 차감 결과. 부족 재고 목록은 알림 트리거의 근거가 된다."""

    changes: list[MaterialStockChange]
    low_stock_materials: list[MaterialStockChange]


class StockAdjustment(BaseModel):
    """수동 재고 보정/폐기 (실사, 폐기 등)."""

    quantity_changed: Decimal = Field(description="양수=증가, 음수=차감")
    reason_code: ReasonCode

    model_config = ConfigDict(use_enum_values=False)


class InventoryTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    material_id: int
    quantity_changed: Decimal
    reason_code: ReasonCode
    actor_id: int | None
    reference: str | None
