"""메뉴 및 레시피(BOM) 비즈니스 로직. 모든 작업은 store_id로 격리한다."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.models.menu import Menu
from app.models.recipe import Recipe
from app.schemas.menu import MenuCreate, MenuUpdate
from app.schemas.recipe import RecipeItemCreate, RecipeItemUpdate


class MenuNotFound(Exception):
    pass


class RecipeNotFound(Exception):
    pass


class InvalidRecipe(Exception):
    """존재하지 않거나 타 매장 원자재 참조 등 레시피 무결성 위반."""


# --- 메뉴 ---


async def create_menu(db: AsyncSession, store_id: int, payload: MenuCreate) -> Menu:
    menu = Menu(
        store_id=store_id,
        name=payload.name,
        price=payload.price,
        pos_menu_code=payload.pos_menu_code,
    )
    db.add(menu)
    await db.commit()
    await db.refresh(menu)
    return menu


async def list_menus(db: AsyncSession, store_id: int) -> list[Menu]:
    result = await db.execute(
        select(Menu).where(Menu.store_id == store_id).order_by(Menu.name)
    )
    return list(result.scalars().all())


async def get_menu(db: AsyncSession, store_id: int, menu_id: int) -> Menu:
    result = await db.execute(
        select(Menu).where(Menu.id == menu_id, Menu.store_id == store_id)
    )
    menu = result.scalar_one_or_none()
    if menu is None:
        raise MenuNotFound("메뉴를 찾을 수 없습니다.")
    return menu


async def update_menu(
    db: AsyncSession, store_id: int, menu_id: int, payload: MenuUpdate
) -> Menu:
    menu = await get_menu(db, store_id, menu_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(menu, field, value)
    await db.commit()
    await db.refresh(menu)
    return menu


async def delete_menu(db: AsyncSession, store_id: int, menu_id: int) -> None:
    menu = await get_menu(db, store_id, menu_id)
    await db.delete(menu)
    await db.commit()


# --- 레시피 (BOM) ---


async def _assert_material_in_store(db: AsyncSession, store_id: int, material_id: int) -> None:
    result = await db.execute(
        select(Material.id).where(
            Material.id == material_id, Material.store_id == store_id
        )
    )
    if result.scalar_one_or_none() is None:
        raise InvalidRecipe("해당 매장에 존재하지 않는 원자재입니다.")


async def add_recipe_item(
    db: AsyncSession, store_id: int, menu_id: int, payload: RecipeItemCreate
) -> Recipe:
    # 메뉴와 원자재가 모두 같은 매장 소속인지 검증
    await get_menu(db, store_id, menu_id)
    await _assert_material_in_store(db, store_id, payload.material_id)

    # 동일 메뉴-원자재 중복 방지
    existing = await db.execute(
        select(Recipe).where(
            Recipe.menu_id == menu_id, Recipe.material_id == payload.material_id
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise InvalidRecipe("이미 등록된 원자재입니다. 수정으로 변경하세요.")

    recipe = Recipe(
        store_id=store_id,
        menu_id=menu_id,
        material_id=payload.material_id,
        quantity_per_unit=payload.quantity_per_unit,
        instructions=payload.instructions,
        image_url=payload.image_url,
    )
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


async def list_recipe_items(db: AsyncSession, store_id: int, menu_id: int) -> list[Recipe]:
    await get_menu(db, store_id, menu_id)
    result = await db.execute(
        select(Recipe).where(Recipe.menu_id == menu_id, Recipe.store_id == store_id)
    )
    return list(result.scalars().all())


async def update_recipe_item(
    db: AsyncSession,
    store_id: int,
    menu_id: int,
    recipe_id: int,
    payload: RecipeItemUpdate,
) -> Recipe:
    recipe = await _get_recipe(db, store_id, menu_id, recipe_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    await db.commit()
    await db.refresh(recipe)
    return recipe


async def delete_recipe_item(
    db: AsyncSession, store_id: int, menu_id: int, recipe_id: int
) -> None:
    recipe = await _get_recipe(db, store_id, menu_id, recipe_id)
    await db.delete(recipe)
    await db.commit()


async def _get_recipe(
    db: AsyncSession, store_id: int, menu_id: int, recipe_id: int
) -> Recipe:
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.menu_id == menu_id,
            Recipe.store_id == store_id,
        )
    )
    recipe = result.scalar_one_or_none()
    if recipe is None:
        raise RecipeNotFound("레시피 항목을 찾을 수 없습니다.")
    return recipe
