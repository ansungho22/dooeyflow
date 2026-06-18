"""v1 API 라우터 집합."""

from fastapi import APIRouter

from app.api.v1.routes import auth, materials, menus

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(materials.router)
api_router.include_router(menus.router)
