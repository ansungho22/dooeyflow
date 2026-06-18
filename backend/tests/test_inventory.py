"""재고 차감 핵심 로직 테스트.

제품의 심장부이므로 정밀도·집계·원자성·감사로그·부족감지를 집중 검증한다.
"""

from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import create_store, register_and_login


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _material(
    client: AsyncClient, token: str, store_id: int, name: str, stock: str, safety: str = "0"
) -> int:
    resp = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": name, "unit": "g", "current_stock": stock, "safety_stock": safety},
        headers=_auth(token),
    )
    return resp.json()["id"]


async def _menu_with_recipe(
    client: AsyncClient,
    token: str,
    store_id: int,
    name: str,
    items: list[tuple[int, str]],
) -> int:
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": name, "price": "4500"},
        headers=_auth(token),
    )
    menu_id = menu.json()["id"]
    for material_id, qty in items:
        await client.post(
            f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
            json={"material_id": material_id, "quantity_per_unit": qty},
            headers=_auth(token),
        )
    return menu_id


async def test_batch_sale_deducts_with_decimal_precision(client: AsyncClient) -> None:
    """원두 18g 메뉴를 3개 팔면 정확히 54g 차감 (1000 → 946)."""
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    bean = await _material(client, token, store_id, "원두", "1000.0000")
    americano = await _menu_with_recipe(
        client, token, store_id, "아메리카노", [(bean, "18.0000")]
    )

    # Act
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": americano, "quantity_sold": 3}]},
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 200
    change = resp.json()["changes"][0]
    assert change["consumed"] == "54.0000"
    assert change["remaining_stock"] == "946.0000"


async def test_batch_sale_aggregates_shared_material(client: AsyncClient) -> None:
    """여러 메뉴가 같은 원자재(우유)를 쓰면 소비량을 합산해 차감한다."""
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    milk = await _material(client, token, store_id, "우유", "1000.0000")
    latte = await _menu_with_recipe(client, token, store_id, "라떼", [(milk, "150.0000")])
    cappu = await _menu_with_recipe(
        client, token, store_id, "카푸치노", [(milk, "120.0000")]
    )

    # Act: 라떼 2잔(300) + 카푸치노 1잔(120) = 420 차감
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={
            "lines": [
                {"menu_id": latte, "quantity_sold": 2},
                {"menu_id": cappu, "quantity_sold": 1},
            ]
        },
        headers=_auth(token),
    )

    # Assert: 우유는 한 줄로 합산되어야 함
    body = resp.json()
    assert len(body["changes"]) == 1
    assert body["changes"][0]["consumed"] == "420.0000"
    assert body["changes"][0]["remaining_stock"] == "580.0000"


async def test_batch_sale_flags_low_stock(client: AsyncClient) -> None:
    """차감 후 안전재고 이하로 떨어지면 low_stock_materials에 포함."""
    # Arrange: 재고 100, 안전재고 60
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    bean = await _material(client, token, store_id, "원두", "100.0000", safety="60.0000")
    menu = await _menu_with_recipe(client, token, store_id, "아메리카노", [(bean, "18")])

    # Act: 3잔 → 54 차감 → 46 남음 (< 60)
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu, "quantity_sold": 3}]},
        headers=_auth(token),
    )

    # Assert
    body = resp.json()
    assert len(body["low_stock_materials"]) == 1
    assert body["low_stock_materials"][0]["remaining_stock"] == "46.0000"


async def test_batch_sale_creates_audit_log(client: AsyncClient) -> None:
    """차감은 reason_code=SALE 감사 로그를 남겨야 한다."""
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    bean = await _material(client, token, store_id, "원두", "1000")
    menu = await _menu_with_recipe(client, token, store_id, "아메리카노", [(bean, "18")])
    await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu, "quantity_sold": 2}]},
        headers=_auth(token),
    )

    # Act
    resp = await client.get(
        f"/api/v1/stores/{store_id}/inventory/transactions", headers=_auth(token)
    )

    # Assert
    txns = resp.json()
    assert len(txns) == 1
    assert txns[0]["reason_code"] == "SALE"
    assert txns[0]["quantity_changed"] == "-36.0000"
    assert txns[0]["actor_id"] is not None


async def test_batch_sale_atomic_rollback_on_invalid_menu(client: AsyncClient) -> None:
    """존재하지 않는 메뉴가 섞이면 어떤 재고도 차감되면 안 된다 (원자성)."""
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    bean = await _material(client, token, store_id, "원두", "1000.0000")
    valid_menu = await _menu_with_recipe(
        client, token, store_id, "아메리카노", [(bean, "18")]
    )

    # Act: 유효 메뉴 + 존재하지 않는 메뉴(99999)
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={
            "lines": [
                {"menu_id": valid_menu, "quantity_sold": 5},
                {"menu_id": 99999, "quantity_sold": 1},
            ]
        },
        headers=_auth(token),
    )

    # Assert: 400 + 재고 변동 없음 + 감사로그 없음
    assert resp.status_code == 400
    material = await client.get(
        f"/api/v1/stores/{store_id}/materials/{bean}", headers=_auth(token)
    )
    assert material.json()["current_stock"] == "1000.0000"
    txns = await client.get(
        f"/api/v1/stores/{store_id}/inventory/transactions", headers=_auth(token)
    )
    assert txns.json() == []


async def test_stock_adjustment_waste(client: AsyncClient) -> None:
    """폐기(WASTE) 보정: 재고 차감 + 감사 로그."""
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    bean = await _material(client, token, store_id, "원두", "100.0000")

    # Act: 10g 폐기
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/materials/{bean}/adjust",
        json={"quantity_changed": "-10.0000", "reason_code": "WASTE"},
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["current_stock"] == "90.0000"


async def test_batch_sale_requires_auth(client: AsyncClient) -> None:
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": 1, "quantity_sold": 1}]},
    )
    assert resp.status_code == 401


async def test_decimal_no_float_drift(client: AsyncClient) -> None:
    """0.1 같은 값이 반복 차감돼도 부동소수점 오차가 없어야 한다."""
    # Arrange: 소모량 0.1, 7번 판매 → 정확히 0.7
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    mat = await _material(client, token, store_id, "바닐라시럽", "10.0000")
    menu = await _menu_with_recipe(client, token, store_id, "바닐라라떼", [(mat, "0.1000")])

    # Act
    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu, "quantity_sold": 7}]},
        headers=_auth(token),
    )

    # Assert: 10 - 0.7 = 9.3 정확히
    change = resp.json()["changes"][0]
    assert Decimal(change["consumed"]) == Decimal("0.7000")
    assert Decimal(change["remaining_stock"]) == Decimal("9.3000")
