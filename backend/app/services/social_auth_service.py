"""소셜 로그인 비즈니스 로직. Apple, Kakao, Naver OAuth 처리."""

from typing import Literal
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User

AuthProvider = Literal["apple", "kakao", "naver"]


class SocialAuthError(Exception):
    """소셜 인증 오류."""


class InvalidToken(SocialAuthError):
    """잘못된 토큰."""


class ProviderError(SocialAuthError):
    """OAuth 제공자 API 오류."""


def get_oauth_authorization_url(provider: AuthProvider, state: str) -> str:
    """OAuth 인증 시작 URL 생성."""
    redirect_uri = f"{settings.oauth_redirect_base}/auth/callback/{provider}"

    if provider == "apple":
        params = {
            "client_id": settings.apple_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "response_mode": "form_post",
            "scope": "name email",
            "state": state,
        }
        return f"https://appleid.apple.com/auth/authorize?{urlencode(params)}"

    elif provider == "kakao":
        params = {
            "client_id": settings.kakao_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
        }
        return f"https://kauth.kakao.com/oauth/authorize?{urlencode(params)}"

    elif provider == "naver":
        params = {
            "client_id": settings.naver_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
        }
        return f"https://nid.naver.com/oauth2.0/authorize?{urlencode(params)}"

    raise ValueError(f"Unknown provider: {provider}")


async def _exchange_code_for_token_kakao(code: str) -> dict:
    """카카오 code를 access_token으로 교환."""
    redirect_uri = f"{settings.oauth_redirect_base}/auth/callback/kakao"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.kakao_client_id,
                "client_secret": settings.kakao_client_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        if resp.status_code != 200:
            raise ProviderError(f"Kakao token exchange failed: {resp.text}")
        return resp.json()


async def _get_kakao_user_info(access_token: str) -> dict:
    """카카오 사용자 정보 조회."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            raise ProviderError(f"Kakao user info failed: {resp.text}")
        return resp.json()


async def _exchange_code_for_token_naver(code: str, state: str) -> dict:
    """네이버 code를 access_token으로 교환."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://nid.naver.com/oauth2.0/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.naver_client_id,
                "client_secret": settings.naver_client_secret,
                "code": code,
                "state": state,
            },
        )
        if resp.status_code != 200:
            raise ProviderError(f"Naver token exchange failed: {resp.text}")
        return resp.json()


async def _get_naver_user_info(access_token: str) -> dict:
    """네이버 사용자 정보 조회."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            raise ProviderError(f"Naver user info failed: {resp.text}")
        data = resp.json()
        if data.get("resultcode") != "00":
            raise ProviderError(f"Naver user info error: {data.get('message')}")
        return data["response"]


async def authenticate_with_code(
    db: AsyncSession, provider: AuthProvider, code: str, state: str | None = None
) -> User:
    """OAuth code로 사용자 인증. 신규 사용자면 자동 가입."""
    if provider == "kakao":
        token_data = await _exchange_code_for_token_kakao(code)
        user_info = await _get_kakao_user_info(token_data["access_token"])
        provider_id = str(user_info["id"])
        email = user_info.get("kakao_account", {}).get("email")
        name = user_info.get("kakao_account", {}).get("profile", {}).get("nickname")

    elif provider == "naver":
        token_data = await _exchange_code_for_token_naver(code, state or "")
        user_info = await _get_naver_user_info(token_data["access_token"])
        provider_id = user_info["id"]
        email = user_info.get("email")
        name = user_info.get("name") or user_info.get("nickname")

    elif provider == "apple":
        # Apple은 id_token에서 정보 추출 (더 복잡한 JWT 검증 필요)
        # 여기서는 간단히 code를 provider_id로 사용 (실제 구현 시 JWT 파싱 필요)
        raise NotImplementedError("Apple 로그인은 아직 구현 중입니다.")

    else:
        raise ValueError(f"Unknown provider: {provider}")

    # 기존 소셜 계정 확인
    result = await db.execute(
        select(User).where(
            User.auth_provider == provider, User.auth_provider_id == provider_id
        )
    )
    user = result.scalar_one_or_none()

    if user:
        return user

    # 이메일 중복 시 자동 병합하지 않음 — 계정 탈취 벡터 차단
    if email:
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise SocialAuthError("이미 이메일/비밀번호로 가입된 계정입니다. 기존 계정으로 로그인 후 소셜 연결을 진행해 주세요.")

    # 신규 사용자 생성
    if not email:
        # 이메일이 없으면 임시 이메일 생성
        email = f"{provider}_{provider_id}@social.dooeyflow.local"

    new_user = User(
        email=email,
        hashed_password=None,  # 소셜 로그인 사용자는 비밀번호 없음
        full_name=name,
        auth_provider=provider,
        auth_provider_id=provider_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user
