"""헬스 체크 엔드포인트 테스트."""

from httpx import AsyncClient


async def test_health_check_returns_ok(client: AsyncClient) -> None:
    # Act
    response = await client.get("/health")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "environment" in body
