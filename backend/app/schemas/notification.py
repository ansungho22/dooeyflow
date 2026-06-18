"""디바이스 토큰/알림 스키마."""

from pydantic import BaseModel, ConfigDict, Field

from app.models.device_token import DevicePlatform


class DeviceTokenCreate(BaseModel):
    platform: DevicePlatform
    token: str = Field(min_length=1, max_length=512)


class DeviceTokenRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: DevicePlatform
    token: str
    is_active: bool


class PushMessage(BaseModel):
    """발송할 푸시 메시지 페이로드."""

    title: str
    body: str
