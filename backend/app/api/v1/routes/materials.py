"""원자재 라우터. 매장 소유권은 get_owned_store 의존성으로 강제한다."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import OwnedStore
from app.core.database import get_db
from app.schemas.material import MaterialCreate, MaterialRead, MaterialUpdate
from app.services import material_service

router = APIRouter(prefix="/stores/{store_id}/materials", tags=["materials"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("", response_model=MaterialRead, status_code=status.HTTP_201_CREATED)
async def create_material(
    payload: MaterialCreate, store: OwnedStore, db: DbSession
) -> MaterialRead:
    material = await material_service.create_material(db, store.id, payload)
    return MaterialRead.model_validate(material)


@router.get("", response_model=list[MaterialRead])
async def list_materials(store: OwnedStore, db: DbSession) -> list[MaterialRead]:
    materials = await material_service.list_materials(db, store.id)
    return [MaterialRead.model_validate(m) for m in materials]


@router.get("/{material_id}", response_model=MaterialRead)
async def get_material(material_id: int, store: OwnedStore, db: DbSession) -> MaterialRead:
    try:
        material = await material_service.get_material(db, store.id, material_id)
    except material_service.MaterialNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return MaterialRead.model_validate(material)


@router.patch("/{material_id}", response_model=MaterialRead)
async def update_material(
    material_id: int, payload: MaterialUpdate, store: OwnedStore, db: DbSession
) -> MaterialRead:
    try:
        material = await material_service.update_material(db, store.id, material_id, payload)
    except material_service.MaterialNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return MaterialRead.model_validate(material)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(material_id: int, store: OwnedStore, db: DbSession) -> None:
    try:
        await material_service.delete_material(db, store.id, material_id)
    except material_service.MaterialNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
