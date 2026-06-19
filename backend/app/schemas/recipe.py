"""레시피(BOM) 요청·응답 스키마."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class RecipeItemCreate(BaseModel):
    material_id: int
    # 메뉴 1개당 소모량 (양수만 허용)
    quantity_per_unit: Decimal = Field(gt=Decimal("0"))
    instructions: str | None = None
    image_url: str | None = None


class RecipeItemUpdate(BaseModel):
    quantity_per_unit: Decimal | None = Field(default=None, gt=Decimal("0"))
    instructions: str | None = None
    image_url: str | None = None


class RecipeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    menu_id: int
    material_id: int
    quantity_per_unit: Decimal
    instructions: str | None
    image_url: str | None
