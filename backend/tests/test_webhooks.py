"""토스 웹훅 통합 테스트: 서명 검증 + 멱등성 + 자동 차감."""

import hashlib
import hmac
import json

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.idempotency import IdempotencyStore, get_idempotency_store
from app.main import app
from tests.conftest import create_store, register_and_login

_SECRET = "test-webhook-secret"


class InMemoryIdempotencyStore:
    """테스트용 멱등성 저장소 (Redis 대체)."""

    def __init__(self) -> None:
        self._seen: set[str] = set()

    async def acquire(self, key: str) -> bool:
        if key in self._seen:
            return False
        self._seen.add(key)
        return True


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _sign(body: dict) -> tuple[bytes, str]:
    raw = json.dumps(body).encode("utf-8")
    sig = hmac.new(_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    return raw, sig


@pytest.fixture(autouse=True)
def _configure_webhook(monkeypatch: pytest.MonkeyPatch) -> InMemoryIdempotencyStore:
    """웹훅 시크릿 설정 + 멱등성 저장소를 인메모리로 오버라이드."""
    monkeypatch.setattr(settings, "toss_webhook_secret", _SECRET)
    store = InMemoryIdempotencyStore()

    async def _override() -> IdempotencyStore:
        return store

    app.dependency_overrides[get_idempotency_store] = _override
    yield store
    app.dependency_overrides.pop(get_idempotency_store, None)


async def _setup_store_menu(client: AsyncClient) -> tuple[str, int, int]:
    """매장 + 원자재 + POS 코드 'AMR' 메뉴(원두 18g) 구성."""
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


async def test_webhook_rejects_missing_signature(client: AsyncClient) -> None:
    body = {"order_id": "o1", "store_id": 1, "items": [{"pos_menu_code": "AMR", "quantity": 1}]}
    resp = await client.post("/api/v1/webhooks/toss", content=json.dumps(body).encode())
    assert resp.status_code == 401


async def test_webhook_rejects_bad_signature(client: AsyncClient) -> None:
    body = {"order_id": "o1", "store_id": 1, "items": [{"pos_menu_code": "AMR", "quantity": 1}]}
    raw = json.dumps(body).encode()
    resp = await client.post(
        "/api/v1/webhooks/toss",
        content=raw,
        headers={"X-Toss-Signature": "deadbeef"},
    )
    assert resp.status_code == 401


async def test_webhook_processes_and_deducts(client: AsyncClient) -> None:
    # Arrange
    token, store_id, material_id = await _setup_store_menu(client)
    body = {
        "order_id": "order-001",
        "store_id": store_id,
        "items": [{"pos_menu_code": "AMR", "quantity": 2}],
    }
    raw, sig = _sign(body)

    # Act
    resp = await client.post(
        "/api/v1/webhooks/toss", content=raw, headers={"X-Toss-Signature": sig}
    )

    # Assert: 200 processed + 원두 36g 차감 (1000 → 964)
    assert resp.status_code == 200
    assert resp.json()["status"] == "processed"
    mat = await client.get(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    assert mat.json()["current_stock"] == "964.0000"


async def test_webhook_idempotent_duplicate(client: AsyncClient) -> None:
    """같은 orderId 재수신 시 이중 차감되지 않아야 한다."""
    # Arrange
    token, store_id, material_id = await _setup_store_menu(client)
    body = {
        "order_id": "order-dup",
        "store_id": store_id,
        "items": [{"pos_menu_code": "AMR", "quantity": 5}],
    }
    raw, sig = _sign(body)

    # Act: 동일 웹훅 2회 수신
    first = await client.post(
        "/api/v1/webhooks/toss", content=raw, headers={"X-Toss-Signature": sig}
    )
    second = await client.post(
        "/api/v1/webhooks/toss", content=raw, headers={"X-Toss-Signature": sig}
    )

    # Assert: 1회만 차감 (1000 - 90 = 910), 2번째는 duplicate
    assert first.json()["status"] == "processed"
    assert second.json()["status"] == "duplicate"
    mat = await client.get(
        f"/api/v1/stores/{store_id}/materials/{material_id}", headers=_auth(token)
    )
    assert mat.json()["current_stock"] == "910.0000"


async def test_webhook_unknown_menu_skipped(client: AsyncClient) -> None:
    """등록되지 않은 POS 코드는 차감 없이 기록만 한다."""
    # Arrange
    _, store_id, material_id = await _setup_store_menu(client)
    body = {
        "order_id": "order-unknown",
        "store_id": store_id,
        "items": [{"pos_menu_code": "UNKNOWN", "quantity": 3}],
    }
    raw, sig = _sign(body)

    # Act
    resp = await client.post(
        "/api/v1/webhooks/toss", content=raw, headers={"X-Toss-Signature": sig}
    )

    # Assert
    assert resp.json()["status"] == "unknown_menu_skipped"
