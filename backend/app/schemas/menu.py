"""메뉴 요청·응답 스키마."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MenuCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    price: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    pos_menu_code: str | None = Field(default=None, max_length=100)


class MenuUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    price: Decimal | None = Field(default=None, ge=Decimal("0"))
    pos_menu_code: str | None = Field(default=None, max_length=100)


class MenuRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    name: str
    price: Decimal
    pos_menu_code: str | None
