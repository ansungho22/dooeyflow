"""원자재 요청·응답 스키마."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# 재고 수량은 음수가 될 수 없다 (차감은 트랜잭션 로직에서 처리)
_NonNegative = Field(ge=Decimal("0"))


class MaterialCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    unit: str = Field(min_length=1, max_length=20)
    current_stock: Decimal = _NonNegative
    safety_stock: Decimal = _NonNegative


class MaterialUpdate(BaseModel):
    """부분 수정. 전달된 필드만 반영한다."""

    name: str | None = Field(default=None, min_length=1, max_length=150)
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    current_stock: Decimal | None = Field(default=None, ge=Decimal("0"))
    safety_stock: Decimal | None = Field(default=None, ge=Decimal("0"))


class MaterialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    name: str
    unit: str
    current_stock: Decimal
    safety_stock: Decimal
    is_low_stock: bool = False
