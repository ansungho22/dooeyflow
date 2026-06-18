"""FastAPI 애플리케이션 진입점."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.schemas.common import HealthResponse

app = FastAPI(
    title="Dooeyflow API",
    description="요식업 재고관리 앱 백엔드",
    version="0.1.0",
)

# 프론트엔드(웹/네이티브)의 교차 출처 요청 허용. 와일드카드+credentials 조합은 피한다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """헬스 체크 — 서비스 가동 여부 확인."""
    return HealthResponse(status="ok", environment=settings.environment)
