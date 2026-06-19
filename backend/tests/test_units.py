"""단위(kg/g 등) 기반 재고 차감 계산 정확성 검증.

핵심: 시스템은 '원자재마다 하나의 단위'로 재고와 레시피를 같은 단위로 관리한다.
판매 입력 시 (레시피 소모량 × 판매수량)을 Decimal로 정밀 차감한다.
교차 단위 변환은 하지 않으므로, 재고와 레시피는 같은 단위여야 한다.
"""

from decimal import Decimal

from httpx import AsyncClient

from tests.conftest import create_store, register_and_login


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _make_menu_with_recipe(
    client: AsyncClient,
    token: str,
    store_id: int,
    *,
    unit: str,
    stock: str,
    qty_per_unit: str,
) -> tuple[int, int]:
    """단위/재고/레시피소모량을 지정해 원자재+메뉴+레시피를 만든다."""
    mat = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "원두", "unit": unit, "current_stock": stock, "safety_stock": "0"},
        headers=_auth(token),
    )
    material_id = mat.json()["id"]
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "아메리카노", "price": "4500"},
        headers=_auth(token),
    )
    menu_id = menu.json()["id"]
    await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
        json={"material_id": material_id, "quantity_per_unit": qty_per_unit},
        headers=_auth(token),
    )
    return material_id, menu_id


async def test_grams_exact_deduction(client: AsyncClient) -> None:
    """원두 500g, 아메리카노 20g, 3잔 → 정확히 440g (사장님 예시: 100g×5개)."""
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    material_id, menu_id = await _make_menu_with_recipe(
        client, token, store_id, unit="g", stock="500", qty_per_unit="20"
    )

    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu_id, "quantity_sold": 3}]},
        headers=_auth(token),
    )

    assert resp.json()["changes"][0]["consumed"] == "60.0000"
    mat = await client.get(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    assert mat.json()["current_stock"] == "440.0000"


async def test_kilograms_exact_deduction(client: AsyncClient) -> None:
    """원두 0.5kg, 아메리카노 0.02kg, 3잔 → 정확히 0.44kg (kg 단위도 정확)."""
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    material_id, menu_id = await _make_menu_with_recipe(
        client, token, store_id, unit="kg", stock="0.5", qty_per_unit="0.02"
    )

    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu_id, "quantity_sold": 3}]},
        headers=_auth(token),
    )

    assert Decimal(resp.json()["changes"][0]["consumed"]) == Decimal("0.0600")
    mat = await client.get(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    assert Decimal(mat.json()["current_stock"]) == Decimal("0.4400")


async def test_no_cross_unit_conversion(client: AsyncClient) -> None:
    """단위 라벨이 kg여도 숫자만 계산한다 (g/kg 자동 변환 없음 — 같은 단위로 관리해야 함)."""
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    # kg로 관리하는 재고에 '20'을 레시피로 넣으면 20kg로 계산됨 (변환 안 함)
    material_id, menu_id = await _make_menu_with_recipe(
        client, token, store_id, unit="kg", stock="100", qty_per_unit="20"
    )

    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu_id, "quantity_sold": 2}]},
        headers=_auth(token),
    )

    # 20 × 2 = 40 차감 (kg 라벨이지만 숫자 그대로) → 100 - 40 = 60
    assert resp.json()["changes"][0]["consumed"] == "40.0000"
    mat = await client.get(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    assert mat.json()["current_stock"] == "60.0000"


async def test_decimal4_precision_boundary(client: AsyncClient) -> None:
    """DECIMAL(12,4) 한계: 소수점 4자리까지 정확. 0.0025 같은 값도 정밀 차감."""
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    material_id, menu_id = await _make_menu_with_recipe(
        client, token, store_id, unit="kg", stock="1", qty_per_unit="0.0025"
    )

    resp = await client.post(
        f"/api/v1/stores/{store_id}/inventory/batch-sale",
        json={"lines": [{"menu_id": menu_id, "quantity_sold": 4}]},
        headers=_auth(token),
    )

    # 0.0025 × 4 = 0.01 정확
    assert Decimal(resp.json()["changes"][0]["consumed"]) == Decimal("0.0100")
    mat = await client.get(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    assert Decimal(mat.json()["current_stock"]) == Decimal("0.9900")
