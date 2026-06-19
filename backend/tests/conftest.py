"""pytest 공통 픽스처. 테스트는 인메모리 SQLite로 빠르게 격리 실행한다."""

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """테스트 단위 격리 DB 세션 (인메모리, 단일 커넥션 공유)."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """테스트용 비동기 HTTP 클라이언트 (DB 의존성 오버라이드)."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def register_and_login(client: AsyncClient, email: str = "owner@test.com") -> str:
    """헬퍼: 회원가입 + 로그인 후 액세스 토큰 반환."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "supersecret", "full_name": "사장"},
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "supersecret"}
    )
    return resp.json()["access_token"]


async def create_store(client: AsyncClient, token: str, name: str = "테스트 카페") -> int:
    """헬퍼: 매장 생성 후 store_id 반환."""
    resp = await client.post(
        "/api/v1/auth/stores",
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
    )
    return resp.json()["id"]
