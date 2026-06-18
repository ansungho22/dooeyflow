"""원자재 CRUD 통합 테스트. 멀티매장 격리에 특히 집중한다."""

from httpx import AsyncClient

from tests.conftest import create_store, register_and_login


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_create_material(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)

    # Act
    resp = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={
            "name": "원두",
            "unit": "g",
            "current_stock": "1000.5000",
            "safety_stock": "100.0000",
        },
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "원두"
    assert body["current_stock"] == "1000.5000"
    assert body["is_low_stock"] is False


async def test_create_material_rejects_negative_stock(client: AsyncClient) -> None:
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    resp = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "우유", "unit": "ml", "current_stock": "-1", "safety_stock": "0"},
        headers=_auth(token),
    )
    assert resp.status_code == 422


async def test_low_stock_flag(client: AsyncClient) -> None:
    # Arrange: 현재고 == 안전재고 → 부족으로 간주
    token = await register_and_login(client)
    store_id = await create_store(client, token)

    # Act
    resp = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "설탕", "unit": "g", "current_stock": "50", "safety_stock": "50"},
        headers=_auth(token),
    )

    # Assert
    assert resp.json()["is_low_stock"] is True


async def test_list_update_delete_flow(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    created = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "원두", "unit": "g", "current_stock": "1000", "safety_stock": "100"},
        headers=_auth(token),
    )
    material_id = created.json()["id"]

    # Act: 수정
    patch = await client.patch(
        f"/api/v1/stores/{store_id}/materials/{material_id}",
        json={"current_stock": "500"},
        headers=_auth(token),
    )
    # Act: 삭제
    delete = await client.delete(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    # Act: 삭제 후 조회
    after = await client.get(
        f"/api/v1/stores/{store_id}/materials", headers=_auth(token)
    )

    # Assert
    assert patch.json()["current_stock"] == "500.0000"
    assert delete.status_code == 204
    assert after.json() == []


async def test_material_requires_auth(client: AsyncClient) -> None:
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    resp = await client.get(f"/api/v1/stores/{store_id}/materials")
    assert resp.status_code == 401


async def test_cannot_access_other_owners_store_materials(client: AsyncClient) -> None:
    """사장 A의 매장 원자재에 사장 B가 접근하면 404 (격리)."""
    # Arrange: A가 매장 + 원자재 생성
    token_a = await register_and_login(client, "a@test.com")
    store_a = await create_store(client, token_a, "A 카페")
    await client.post(
        f"/api/v1/stores/{store_a}/materials",
        json={"name": "원두", "unit": "g", "current_stock": "10", "safety_stock": "1"},
        headers=_auth(token_a),
    )

    # Arrange: B 가입
    token_b = await register_and_login(client, "b@test.com")

    # Act: B가 A의 매장 원자재 목록 접근
    resp = await client.get(
        f"/api/v1/stores/{store_a}/materials", headers=_auth(token_b)
    )

    # Assert: 소유자가 아니므로 404
    assert resp.status_code == 404
