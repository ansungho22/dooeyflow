"""FastAPI 애플리케이션 진입점."""

from fastapi import FastAPI

from app.core.config import settings
from app.schemas.common import HealthResponse

app = FastAPI(
    title="Dooeyflow API",
    description="요식업 재고관리 앱 백엔드",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """헬스 체크 — 서비스 가동 여부 확인."""
    return HealthResponse(status="ok", environment=settings.environment)
