"""메뉴 + 레시피(BOM) 통합 테스트."""

from httpx import AsyncClient

from tests.conftest import create_store, register_and_login


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _setup_store_with_material(
    client: AsyncClient, token: str
) -> tuple[int, int]:
    store_id = await create_store(client, token)
    mat = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "원두", "unit": "g", "current_stock": "1000", "safety_stock": "100"},
        headers=_auth(token),
    )
    return store_id, mat.json()["id"]


async def test_create_and_list_menu(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)

    # Act
    create = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "아메리카노", "price": "4500", "pos_menu_code": "AMR"},
        headers=_auth(token),
    )
    listing = await client.get(
        f"/api/v1/stores/{store_id}/menus", headers=_auth(token)
    )

    # Assert
    assert create.status_code == 201
    assert create.json()["name"] == "아메리카노"
    assert len(listing.json()) == 1


async def test_add_recipe_item_to_menu(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id, material_id = await _setup_store_with_material(client, token)
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "아메리카노", "price": "4500"},
        headers=_auth(token),
    )
    menu_id = menu.json()["id"]

    # Act: 원두 18g 매핑
    resp = await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
        json={"material_id": material_id, "quantity_per_unit": "18.0000"},
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 201
    assert resp.json()["quantity_per_unit"] == "18.0000"


async def test_recipe_rejects_zero_quantity(client: AsyncClient) -> None:
    token = await register_and_login(client)
    store_id, material_id = await _setup_store_with_material(client, token)
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "라떼", "price": "5000"},
        headers=_auth(token),
    )
    resp = await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu.json()['id']}/recipes",
        json={"material_id": material_id, "quantity_per_unit": "0"},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_recipe_rejects_duplicate_material(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id, material_id = await _setup_store_with_material(client, token)
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "라떼", "price": "5000"},
        headers=_auth(token),
    )
    menu_id = menu.json()["id"]
    body = {"material_id": material_id, "quantity_per_unit": "18"}
    await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
        json=body,
        headers=_auth(token),
    )

    # Act: 같은 원자재 재등록
    resp = await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
        json=body,
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 400


async def test_recipe_rejects_material_from_other_store(client: AsyncClient) -> None:
    """레시피는 같은 매장 원자재만 참조할 수 있어야 한다 (무결성)."""
    # Arrange: A 매장 + A 원자재
    token_a = await register_and_login(client, "a@test.com")
    _, material_a = await _setup_store_with_material(client, token_a)

    # Arrange: B 매장 + B 메뉴
    token_b = await register_and_login(client, "b@test.com")
    store_b = await create_store(client, token_b, "B 카페")
    menu_b = await client.post(
        f"/api/v1/stores/{store_b}/menus",
        json={"name": "B메뉴", "price": "1000"},
        headers=_auth(token_b),
    )

    # Act: B 메뉴에 A 원자재를 매핑 시도
    resp = await client.post(
        f"/api/v1/stores/{store_b}/menus/{menu_b.json()['id']}/recipes",
        json={"material_id": material_a, "quantity_per_unit": "5"},
        headers=_auth(token_b),
    )

    # Assert: 타 매장 원자재 → 400
    assert resp.status_code == 400


async def test_update_and_delete_recipe_item(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id, material_id = await _setup_store_with_material(client, token)
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "라떼", "price": "5000"},
        headers=_auth(token),
    )
    menu_id = menu.json()["id"]
    recipe = await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
        json={"material_id": material_id, "quantity_per_unit": "18"},
        headers=_auth(token),
    )
    recipe_id = recipe.json()["id"]

    # Act
    patch = await client.patch(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes/{recipe_id}",
        json={"quantity_per_unit": "20"},
        headers=_auth(token),
    )
    delete = await client.delete(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes/{recipe_id}",
        headers=_auth(token),
    )

    # Assert
    assert patch.json()["quantity_per_unit"] == "20.0000"
    assert delete.status_code == 204
