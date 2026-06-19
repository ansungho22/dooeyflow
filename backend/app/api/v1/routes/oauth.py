"""OAuth 소셜 로그인 라우터."""

import secrets
from typing import Annotated, Literal

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import limiter
from app.services import social_auth_service

router = APIRouter(prefix="/oauth", tags=["oauth"])

DbSession = Annotated[AsyncSession, Depends(get_db)]
AuthProvider = Literal["apple", "kakao", "naver"]

# OAuth CSRF state TTL: 5분
_OAUTH_STATE_TTL = 60 * 5
# OAuth 일회용 코드 TTL: 30초
_OAUTH_CODE_TTL = 30

_redis_client: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


class OAuthStartResponse(BaseModel):
    """OAuth 시작 응답."""

    authorization_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    """OAuth 콜백 요청."""

    code: str
    state: str | None = None


class OAuthTokenResponse(BaseModel):
    """OAuth 인증 완료 후 토큰 응답."""

    access_token: str
    token_type: str = "bearer"


class OAuthExchangeRequest(BaseModel):
    """일회용 코드 → JWT 교환 요청."""

    code: str


@router.get("/{provider}/start", response_model=OAuthStartResponse)
async def start_oauth(provider: AuthProvider) -> OAuthStartResponse:
    """OAuth 인증 시작. 클라이언트는 반환된 authorization_url로 리다이렉트해야 함."""
    state = secrets.token_urlsafe(32)
    # CSRF 방지: state를 Redis에 저장 (TTL 5분)
    redis = _get_redis()
    await redis.set(f"oauth:state:{state}", "1", ex=_OAUTH_STATE_TTL)
    authorization_url = social_auth_service.get_oauth_authorization_url(provider, state)
    return OAuthStartResponse(authorization_url=authorization_url, state=state)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: AuthProvider,
    db: DbSession,
    code: str = Query(...),
    state: str | None = Query(None),
    error: str | None = Query(None),
) -> RedirectResponse:
    """OAuth 콜백 처리. 성공 시 프론트엔드로 일회용 코드와 함께 리다이렉트."""
    if error:
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error={error}"
        )

    # CSRF 검증: Redis에서 state 확인 후 즉시 삭제
    redis = _get_redis()
    if state is None or not await redis.getdel(f"oauth:state:{state}"):
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error=invalid_state"
        )

    try:
        user = await social_auth_service.authenticate_with_code(db, provider, code, state)
        access_token = create_access_token(user.id)

        # JWT를 URL에 직접 노출하지 않고 일회용 코드로 교환
        exchange_code = secrets.token_urlsafe(32)
        await redis.set(f"oauth:code:{exchange_code}", access_token, ex=_OAUTH_CODE_TTL)

        return RedirectResponse(
            f"{settings.oauth_redirect_base}/auth/callback?code={exchange_code}"
        )
    except social_auth_service.SocialAuthError:
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error=auth_failed"
        )
    except NotImplementedError:
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error=not_implemented"
        )


@router.post("/exchange", response_model=OAuthTokenResponse)
@limiter.limit("10/minute")
async def exchange_oauth_code(request: Request, payload: OAuthExchangeRequest) -> OAuthTokenResponse:
    """일회용 OAuth 코드를 JWT 토큰으로 교환. 코드는 30초 후 만료되며 1회만 사용 가능."""
    redis = _get_redis()
    access_token = await redis.getdel(f"oauth:code:{payload.code}")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 만료된 코드입니다.",
        )
    return OAuthTokenResponse(access_token=access_token)


@router.post("/{provider}/token", response_model=OAuthTokenResponse)
@limiter.limit("10/minute")
async def oauth_token(
    request: Request, provider: AuthProvider, payload: OAuthCallbackRequest, db: DbSession
) -> OAuthTokenResponse:
    """OAuth code를 직접 토큰으로 교환 (SPA용)."""
    try:
        user = await social_auth_service.authenticate_with_code(
            db, provider, payload.code, payload.state
        )
        access_token = create_access_token(user.id)
        return OAuthTokenResponse(access_token=access_token)
    except social_auth_service.SocialAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)
        ) from exc
