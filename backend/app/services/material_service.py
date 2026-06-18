"""원자재 CRUD 비즈니스 로직. 모든 조회는 store_id로 격리한다."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.schemas.material import MaterialCreate, MaterialUpdate


class MaterialNotFound(Exception):
    pass


async def create_material(
    db: AsyncSession, store_id: int, payload: MaterialCreate
) -> Material:
    material = Material(
        store_id=store_id,
        name=payload.name,
        unit=payload.unit,
        current_stock=payload.current_stock,
        safety_stock=payload.safety_stock,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return material


async def list_materials(db: AsyncSession, store_id: int) -> list[Material]:
    result = await db.execute(
        select(Material).where(Material.store_id == store_id).order_by(Material.name)
    )
    return list(result.scalars().all())


async def get_material(db: AsyncSession, store_id: int, material_id: int) -> Material:
    result = await db.execute(
        select(Material).where(
            Material.id == material_id, Material.store_id == store_id
        )
    )
    material = result.scalar_one_or_none()
    if material is None:
        raise MaterialNotFound("원자재를 찾을 수 없습니다.")
    return material


async def update_material(
    db: AsyncSession, store_id: int, material_id: int, payload: MaterialUpdate
) -> Material:
    material = await get_material(db, store_id, material_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(material, field, value)
    await db.commit()
    await db.refresh(material)
    return material


async def delete_material(db: AsyncSession, store_id: int, material_id: int) -> None:
    material = await get_material(db, store_id, material_id)
    await db.delete(material)
    await db.commit()
