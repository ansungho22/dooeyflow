"""매장 조회/수정 통합 테스트. 소유자 검증에 집중한다."""

from httpx import AsyncClient

from tests.conftest import create_store, register_and_login


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_list_stores(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token, "테스트 카페")

    # Act
    resp = await client.get("/api/v1/stores", headers=_auth(token))

    # Assert
    assert resp.status_code == 200
    stores = resp.json()
    assert len(stores) == 1
    assert stores[0]["id"] == store_id
    assert stores[0]["name"] == "테스트 카페"


async def test_get_store(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token, "라떼 하우스")

    # Act
    resp = await client.get(f"/api/v1/stores/{store_id}", headers=_auth(token))

    # Assert
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == store_id
    assert body["name"] == "라떼 하우스"
    assert body["toss_enabled"] is False


async def test_update_store_name(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token, "기존 이름")

    # Act
    resp = await client.patch(
        f"/api/v1/stores/{store_id}",
        json={"name": "새 이름"},
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "새 이름"


async def test_update_store_toss_enabled(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token, "토스 매장")

    # Act
    resp = await client.patch(
        f"/api/v1/stores/{store_id}",
        json={"toss_enabled": True},
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["toss_enabled"] is True


async def test_store_requires_auth(client: AsyncClient) -> None:
    # Act: 토큰 없이 요청
    resp = await client.get("/api/v1/stores")

    # Assert
    assert resp.status_code == 401


async def test_cannot_access_other_owners_store(client: AsyncClient) -> None:
    """사장 A의 매장에 사장 B가 접근하면 404."""
    # Arrange: A가 매장 생성
    token_a = await register_and_login(client, "a@test.com")
    store_a = await create_store(client, token_a, "A 카페")

    # Arrange: B 가입
    token_b = await register_and_login(client, "b@test.com")

    # Act: B가 A의 매장 조회
    resp = await client.get(f"/api/v1/stores/{store_a}", headers=_auth(token_b))

    # Assert: 소유자가 아니므로 404
    assert resp.status_code == 404


async def test_cannot_update_other_owners_store(client: AsyncClient) -> None:
    """사장 A의 매장을 사장 B가 수정하면 404."""
    # Arrange
    token_a = await register_and_login(client, "a@test.com")
    store_a = await create_store(client, token_a, "A 카페")
    token_b = await register_and_login(client, "b@test.com")

    # Act
    resp = await client.patch(
        f"/api/v1/stores/{store_a}",
        json={"name": "해킹 시도"},
        headers=_auth(token_b),
    )

    # Assert
    assert resp.status_code == 404
