"""v1 API 라우터 집합."""

from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    inventory,
    materials,
    menus,
    notifications,
    webhooks,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(materials.router)
api_router.include_router(menus.router)
api_router.include_router(inventory.router)
api_router.include_router(notifications.router)
api_router.include_router(webhooks.router)
