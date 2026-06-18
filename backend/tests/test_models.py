"""DB 스키마/모델 불변식 테스트.

핵심 도메인 규칙이 스키마에 실제로 반영됐는지 검증한다:
- 재고 수량 DECIMAL(12,4) 정밀도
- 모든 도메인 테이블에 store_id 존재 (멀티매장 격리)
- reason_code enum 값
- 소수점 저장/조회 정밀도 라운드트립
"""

from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Base,
    Material,
    Store,
    User,
)
from app.models.inventory_transaction import ReasonCode

# 멀티매장 격리: store_id를 가져야 하는 도메인 테이블
TENANT_TABLES = {
    "materials",
    "menus",
    "recipes",
    "inventory_transactions",
    "toss_orders",
    "device_tokens",
}


def test_all_tenant_tables_have_store_id() -> None:
    # Arrange / Act
    tables = Base.metadata.tables

    # Assert
    for table_name in TENANT_TABLES:
        assert table_name in tables, f"{table_name} 테이블 누락"
        assert "store_id" in tables[table_name].columns, f"{table_name}에 store_id 없음"


def test_material_quantity_uses_decimal_12_4() -> None:
    # Arrange
    columns = Base.metadata.tables["materials"].columns

    # Assert
    for col_name in ("current_stock", "safety_stock"):
        col_type = columns[col_name].type
        assert col_type.precision == 12, f"{col_name} precision != 12"
        assert col_type.scale == 4, f"{col_name} scale != 4"


def test_reason_code_enum_values() -> None:
    assert {c.value for c in ReasonCode} == {"SALE", "WASTE", "AUDIT", "CANCEL"}


async def test_decimal_precision_roundtrip(db_session: AsyncSession) -> None:
    """소수점 수량이 정밀도 손실 없이 저장/조회되는지 검증."""
    # Arrange
    user = User(email="owner@test.com", hashed_password="x")
    db_session.add(user)
    await db_session.flush()
    store = Store(owner_id=user.id, name="테스트 카페")
    db_session.add(store)
    await db_session.flush()

    material = Material(
        store_id=store.id,
        name="원두",
        unit="g",
        current_stock=Decimal("1000.1234"),
        safety_stock=Decimal("50.0000"),
    )
    db_session.add(material)
    await db_session.commit()

    # Act
    result = await db_session.execute(select(Material).where(Material.id == material.id))
    fetched = result.scalar_one()

    # Assert
    assert fetched.current_stock == Decimal("1000.1234")
    assert fetched.safety_stock == Decimal("50.0000")


@pytest.mark.parametrize("email", ["a@test.com", "b@test.com"])
async def test_user_email_persisted(db_session: AsyncSession, email: str) -> None:
    # Arrange
    user = User(email=email, hashed_password="x")
    db_session.add(user)
    await db_session.commit()

    # Act
    result = await db_session.execute(select(User).where(User.email == email))

    # Assert
    assert result.scalar_one().email == email
