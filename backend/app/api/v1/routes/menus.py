"""메뉴 및 레시피(BOM) 라우터."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import OwnedStore
from app.core.database import get_db
from app.schemas.menu import MenuCreate, MenuRead, MenuUpdate
from app.schemas.recipe import RecipeItemCreate, RecipeItemUpdate, RecipeRead
from app.services import menu_service

router = APIRouter(prefix="/stores/{store_id}/menus", tags=["menus"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

_NOT_FOUND = status.HTTP_404_NOT_FOUND
_BAD_REQUEST = status.HTTP_400_BAD_REQUEST


# --- 메뉴 ---


@router.post("", response_model=MenuRead, status_code=status.HTTP_201_CREATED)
async def create_menu(payload: MenuCreate, store: OwnedStore, db: DbSession) -> MenuRead:
    menu = await menu_service.create_menu(db, store.id, payload)
    return MenuRead.model_validate(menu)


@router.get("", response_model=list[MenuRead])
async def list_menus(store: OwnedStore, db: DbSession) -> list[MenuRead]:
    menus = await menu_service.list_menus(db, store.id)
    return [MenuRead.model_validate(m) for m in menus]


@router.get("/{menu_id}", response_model=MenuRead)
async def get_menu(menu_id: int, store: OwnedStore, db: DbSession) -> MenuRead:
    try:
        menu = await menu_service.get_menu(db, store.id, menu_id)
    except menu_service.MenuNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc
    return MenuRead.model_validate(menu)


@router.patch("/{menu_id}", response_model=MenuRead)
async def update_menu(
    menu_id: int, payload: MenuUpdate, store: OwnedStore, db: DbSession
) -> MenuRead:
    try:
        menu = await menu_service.update_menu(db, store.id, menu_id, payload)
    except menu_service.MenuNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc
    return MenuRead.model_validate(menu)


@router.delete("/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu(menu_id: int, store: OwnedStore, db: DbSession) -> None:
    try:
        await menu_service.delete_menu(db, store.id, menu_id)
    except menu_service.MenuNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc


# --- 레시피 (BOM) ---


@router.post(
    "/{menu_id}/recipes", response_model=RecipeRead, status_code=status.HTTP_201_CREATED
)
async def add_recipe_item(
    menu_id: int, payload: RecipeItemCreate, store: OwnedStore, db: DbSession
) -> RecipeRead:
    try:
        recipe = await menu_service.add_recipe_item(db, store.id, menu_id, payload)
    except menu_service.MenuNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc
    except menu_service.InvalidRecipe as exc:
        raise HTTPException(status_code=_BAD_REQUEST, detail=str(exc)) from exc
    return RecipeRead.model_validate(recipe)


@router.get("/{menu_id}/recipes", response_model=list[RecipeRead])
async def list_recipe_items(
    menu_id: int, store: OwnedStore, db: DbSession
) -> list[RecipeRead]:
    try:
        recipes = await menu_service.list_recipe_items(db, store.id, menu_id)
    except menu_service.MenuNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc
    return [RecipeRead.model_validate(r) for r in recipes]


@router.patch("/{menu_id}/recipes/{recipe_id}", response_model=RecipeRead)
async def update_recipe_item(
    menu_id: int,
    recipe_id: int,
    payload: RecipeItemUpdate,
    store: OwnedStore,
    db: DbSession,
) -> RecipeRead:
    try:
        recipe = await menu_service.update_recipe_item(
            db, store.id, menu_id, recipe_id, payload
        )
    except menu_service.RecipeNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc
    return RecipeRead.model_validate(recipe)


@router.delete(
    "/{menu_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_recipe_item(
    menu_id: int, recipe_id: int, store: OwnedStore, db: DbSession
) -> None:
    try:
        await menu_service.delete_recipe_item(db, store.id, menu_id, recipe_id)
    except menu_service.RecipeNotFound as exc:
        raise HTTPException(status_code=_NOT_FOUND, detail=str(exc)) from exc
