"""디바이스 토큰 등록 및 안전재고 알림 디스패치 테스트."""

import pytest
from httpx import AsyncClient

from app.main import app
from app.models.device_token import DeviceToken
from app.schemas.notification import PushMessage
from app.services.notification_service import get_push_sender
from tests.conftest import create_store, register_and_login


class FakeSender:
    """발송 내용을 캡처하는 테스트용 발송기."""

    def __init__(self) -> None:
        self.sent: list[tuple[str, PushMessage]] = []

    async def send(self, token: DeviceToken, message: PushMessage) -> bool:
        self.sent.append((token.token, message))
        return True


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _material(
    client: AsyncClient, token: str, store_id: int, stock: str, safety: str
) -> int:
    resp = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "원두", "unit": "g", "current_stock": stock, "safety_stock": safety},
        headers=_auth(token),
    )
    return resp.json()["id"]


async def test_register_device_token(client: AsyncClient) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)

    # Act
    resp = await client.post(
        f"/api/v1/stores/{store_id}/device-tokens",
        json={"platform": "ios", "token": "apns-device-token-1"},
        headers=_auth(token),
    )

    # Assert
    assert resp.status_code == 201
    assert resp.json()["platform"] == "ios"
    assert resp.json()["is_active"] is True


async def test_register_token_idempotent_upsert(client: AsyncClient) -> None:
    """같은 토큰 재등록 시 중복 생성하지 않는다."""
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    body = {"platform": "web", "token": "same-token"}

    # Act
    await client.post(
        f"/api/v1/stores/{store_id}/device-tokens", json=body, headers=_auth(token)
    )
    await client.post(
        f"/api/v1/stores/{store_id}/device-tokens", json=body, headers=_auth(token)
    )
    listing = await client.get(
        f"/api/v1/stores/{store_id}/device-tokens", headers=_auth(token)
    )

    # Assert
    assert len(listing.json()) == 1


async def test_low_stock_triggers_push(client: AsyncClient) -> None:
    """차감으로 안전재고 이하가 되면 등록된 기기에 알림을 발송한다."""
    # Arrange: fake sender 주입
    fake = FakeSender()
    app.dependency_overrides[get_push_sender] = lambda: fake

    try:
        token = await register_and_login(client)
        store_id = await create_store(client, token)
        await client.post(
            f"/api/v1/stores/{store_id}/device-tokens",
            json={"platform": "ios", "token": "device-A"},
            headers=_auth(token),
        )
        material_id = await _material(client, token, store_id, "100", "60")
        menu = await client.post(
            f"/api/v1/stores/{store_id}/menus",
            json={"name": "아메리카노", "price": "4500"},
            headers=_auth(token),
        )
        menu_id = menu.json()["id"]
        await client.post(
            f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
            json={"material_id": material_id, "quantity_per_unit": "18"},
            headers=_auth(token),
        )

        # Act: 3잔 판매 → 54 차감 → 46 < 60 (부족)
        resp = await client.post(
            f"/api/v1/stores/{store_id}/inventory/batch-sale",
            json={"lines": [{"menu_id": menu_id, "quantity_sold": 3}]},
            headers=_auth(token),
        )

        # Assert: 알림이 device-A로 발송됨
        assert resp.status_code == 200
        assert len(fake.sent) == 1
        assert fake.sent[0][0] == "device-A"
        assert "재고 부족" in fake.sent[0][1].title
    finally:
        app.dependency_overrides.pop(get_push_sender, None)


async def test_no_push_when_stock_sufficient(client: AsyncClient) -> None:
    """차감 후에도 안전재고 이상이면 알림을 보내지 않는다."""
    # Arrange
    fake = FakeSender()
    app.dependency_overrides[get_push_sender] = lambda: fake
    try:
        token = await register_and_login(client)
        store_id = await create_store(client, token)
        await client.post(
            f"/api/v1/stores/{store_id}/device-tokens",
            json={"platform": "ios", "token": "device-B"},
            headers=_auth(token),
        )
        material_id = await _material(client, token, store_id, "1000", "60")
        menu = await client.post(
            f"/api/v1/stores/{store_id}/menus",
            json={"name": "아메리카노", "price": "4500"},
            headers=_auth(token),
        )
        menu_id = menu.json()["id"]
        await client.post(
            f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
            json={"material_id": material_id, "quantity_per_unit": "18"},
            headers=_auth(token),
        )

        # Act: 1잔 → 18 차감 → 982 (충분)
        await client.post(
            f"/api/v1/stores/{store_id}/inventory/batch-sale",
            json={"lines": [{"menu_id": menu_id, "quantity_sold": 1}]},
            headers=_auth(token),
        )

        # Assert: 발송 없음
        assert fake.sent == []
    finally:
        app.dependency_overrides.pop(get_push_sender, None)


@pytest.mark.parametrize("platform", ["ios", "web"])
async def test_token_platforms(client: AsyncClient, platform: str) -> None:
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    resp = await client.post(
        f"/api/v1/stores/{store_id}/device-tokens",
        json={"platform": platform, "token": f"tok-{platform}"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    assert resp.json()["platform"] == platform
