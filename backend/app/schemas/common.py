"""공통 API 응답 스키마."""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class HealthResponse(BaseModel):
    status: str
    environment: str


class Message(BaseModel):
    """단순 메시지 응답."""

    message: str
