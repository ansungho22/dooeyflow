"""매장 요청·응답 스키마."""

from pydantic import BaseModel, ConfigDict, Field


class StoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    toss_enabled: bool = False


class StoreUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    toss_enabled: bool | None = Field(default=None)


class StoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    toss_enabled: bool
