"""인증/온보딩 통합 테스트."""

from httpx import AsyncClient


async def _register(client: AsyncClient, email: str = "owner@test.com") -> dict:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret", "full_name": "사장"},
    )
    return resp.json()


async def _login_token(client: AsyncClient, email: str = "owner@test.com") -> str:
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "supersecret"}
    )
    return resp.json()["access_token"]


async def test_register_returns_user_without_password(client: AsyncClient) -> None:
    # Act
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "a@test.com", "password": "supersecret"},
    )

    # Assert
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "a@test.com"
    assert "password" not in body
    assert "hashed_password" not in body


async def test_register_duplicate_email_conflicts(client: AsyncClient) -> None:
    # Arrange
    await _register(client, "dup@test.com")

    # Act
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@test.com", "password": "supersecret"},
    )

    # Assert
    assert resp.status_code == 409


async def test_register_rejects_short_password(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/register", json={"email": "x@test.com", "password": "short"}
    )
    assert resp.status_code == 422


async def test_login_success_returns_token(client: AsyncClient) -> None:
    # Arrange
    await _register(client)

    # Act
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "owner@test.com", "password": "supersecret"}
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_login_wrong_password_unauthorized(client: AsyncClient) -> None:
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "owner@test.com", "password": "wrongpass1"}
    )
    assert resp.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_returns_current_user(client: AsyncClient) -> None:
    # Arrange
    await _register(client)
    token = await _login_token(client)

    # Act
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["email"] == "owner@test.com"


async def test_create_and_list_store(client: AsyncClient) -> None:
    # Arrange
    await _register(client)
    token = await _login_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Act
    create = await client.post(
        "/api/v1/auth/stores", json={"name": "테스트 카페"}, headers=headers
    )
    listing = await client.get("/api/v1/auth/stores", headers=headers)

    # Assert
    assert create.status_code == 201
    assert create.json()["name"] == "테스트 카페"
    assert len(listing.json()) == 1


async def test_store_list_isolated_per_owner(client: AsyncClient) -> None:
    """다른 사장님의 매장은 보이지 않아야 한다 (멀티매장 격리)."""
    # Arrange: 사장 A가 매장 생성
    await _register(client, "a@test.com")
    token_a = await _login_token(client, "a@test.com")
    await client.post(
        "/api/v1/auth/stores",
        json={"name": "A의 카페"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    # Arrange: 사장 B 가입
    await _register(client, "b@test.com")
    token_b = await _login_token(client, "b@test.com")

    # Act: B가 매장 목록 조회
    resp = await client.get(
        "/api/v1/auth/stores", headers={"Authorization": f"Bearer {token_b}"}
    )

    # Assert: B는 A의 매장을 볼 수 없음
    assert resp.status_code == 200
    assert resp.json() == []
