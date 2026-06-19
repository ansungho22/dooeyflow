"""토스 폴링 테스트: 누락분 처리 + 채널 간 멱등성."""

import hashlib
import hmac
import json

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.idempotency import IdempotencyStore, get_idempotency_store
from app.main import app
from app.schemas.webhook import TossOrderItem, TossWebhookPayload
from app.services.toss_client import get_toss_client
from tests.conftest import create_store, register_and_login

_SECRET = "test-webhook-secret"


class InMemoryIdempotencyStore:
    def __init__(self) -> None:
        self._seen: set[str] = set()

    async def acquire(self, key: str) -> bool:
        if key in self._seen:
            return False
        self._seen.add(key)
        return True


class FakeTossClient:
    """폴링이 조회할 주문을 미리 지정하는 테스트용 클라이언트."""

    def __init__(self, orders: list[TossWebhookPayload]) -> None:
        self._orders = orders

    async def fetch_recent_orders(self, store_id: int) -> list[TossWebhookPayload]:
        return [o for o in self._orders if o.store_id == store_id]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _sign(body: dict) -> tuple[bytes, str]:
    raw = json.dumps(body).encode("utf-8")
    sig = hmac.new(_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    return raw, sig


@pytest.fixture
def idem_store() -> InMemoryIdempotencyStore:
    store = InMemoryIdempotencyStore()

    async def _override() -> IdempotencyStore:
        return store

    app.dependency_overrides[get_idempotency_store] = _override
    yield store
    app.dependency_overrides.pop(get_idempotency_store, None)


async def _setup_store_menu(client: AsyncClient) -> tuple[str, int, int]:
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    mat = await client.post(
        f"/api/v1/stores/{store_id}/materials",
        json={"name": "원두", "unit": "g", "current_stock": "1000", "safety_stock": "100"},
        headers=_auth(token),
    )
    material_id = mat.json()["id"]
    menu = await client.post(
        f"/api/v1/stores/{store_id}/menus",
        json={"name": "아메리카노", "price": "4500", "pos_menu_code": "AMR"},
        headers=_auth(token),
    )
    menu_id = menu.json()["id"]
    await client.post(
        f"/api/v1/stores/{store_id}/menus/{menu_id}/recipes",
        json={"material_id": material_id, "quantity_per_unit": "18"},
        headers=_auth(token),
    )
    return token, store_id, material_id


def _order(store_id: int, order_id: str) -> TossWebhookPayload:
    return TossWebhookPayload(
        order_id=order_id,
        store_id=store_id,
        items=[TossOrderItem(pos_menu_code="AMR", quantity=2)],
    )


async def test_polling_processes_missed_orders(
    client: AsyncClient, idem_store: InMemoryIdempotencyStore
) -> None:
    """웹훅으로 못 받은 주문을 폴링이 후속 처리해 재고를 차감한다."""
    # Arrange
    token, store_id, material_id = await _setup_store_menu(client)
    orders = [_order(store_id, "missed-1"), _order(store_id, "missed-2")]
    app.dependency_overrides[get_toss_client] = lambda: FakeTossClient(orders)

    try:
        # Act
        resp = await client.post(
            f"/api/v1/stores/{store_id}/toss/poll", headers=_auth(token)
        )

        # Assert: 2건 처리, 원두 72g 차감 (1000 → 928)
        assert resp.status_code == 200
        body = resp.json()
        assert body["fetched"] == 2
        assert body["processed"] == 2
        mat = await client.get(
            f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
        )
        assert mat.json()["current_stock"] == "928.0000"
    finally:
        app.dependency_overrides.pop(get_toss_client, None)


async def test_polling_skips_already_processed_webhook(
    client: AsyncClient, idem_store: InMemoryIdempotencyStore
) -> None:
    """웹훅이 이미 처리한 주문을 폴링이 다시 차감하지 않는다 (채널 간 멱등성)."""
    # Arrange
    token, store_id, material_id = await _setup_store_menu(client)
    settings_secret = settings.toss_webhook_secret
    settings.toss_webhook_secret = _SECRET

    try:
        # 웹훅으로 order-X 처리 (1000 → 964)
        body = {
            "order_id": "order-X",
            "store_id": store_id,
            "items": [{"pos_menu_code": "AMR", "quantity": 2}],
        }
        raw, sig = _sign(body)
        await client.post(
            "/api/v1/webhooks/toss", content=raw, headers={"X-Toss-Signature": sig}
        )

        # 폴링이 동일 order-X를 다시 조회
        app.dependency_overrides[get_toss_client] = lambda: FakeTossClient(
            [_order(store_id, "order-X")]
        )

        # Act
        resp = await client.post(
            f"/api/v1/stores/{store_id}/toss/poll", headers=_auth(token)
        )

        # Assert: 중복으로 분류, 추가 차감 없음 (여전히 964)
        assert resp.json()["duplicate"] == 1
        assert resp.json()["processed"] == 0
        mat = await client.get(
            f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
        )
        assert mat.json()["current_stock"] == "964.0000"
    finally:
        settings.toss_webhook_secret = settings_secret
        app.dependency_overrides.pop(get_toss_client, None)


async def test_polling_empty_when_no_orders(
    client: AsyncClient, idem_store: InMemoryIdempotencyStore
) -> None:
    # Arrange
    token = await register_and_login(client)
    store_id = await create_store(client, token)
    app.dependency_overrides[get_toss_client] = lambda: FakeTossClient([])

    try:
        # Act
        resp = await client.post(
            f"/api/v1/stores/{store_id}/toss/poll", headers=_auth(token)
        )

        # Assert
        assert resp.json() == {"fetched": 0, "processed": 0, "duplicate": 0}
    finally:
        app.dependency_overrides.pop(get_toss_client, None)
