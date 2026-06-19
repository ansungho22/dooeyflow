"""OAuth 소셜 로그인 라우터."""

import secrets
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.services import social_auth_service

router = APIRouter(prefix="/oauth", tags=["oauth"])

DbSession = Annotated[AsyncSession, Depends(get_db)]
AuthProvider = Literal["apple", "kakao", "naver"]


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


@router.get("/{provider}/start", response_model=OAuthStartResponse)
async def start_oauth(provider: AuthProvider) -> OAuthStartResponse:
    """OAuth 인증 시작. 클라이언트는 반환된 authorization_url로 리다이렉트해야 함."""
    state = secrets.token_urlsafe(32)
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
    """OAuth 콜백 처리. 성공 시 프론트엔드로 토큰과 함께 리다이렉트."""
    if error:
        # 사용자가 인증을 거부했거나 오류 발생
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error={error}"
        )

    try:
        user = await social_auth_service.authenticate_with_code(db, provider, code, state)
        access_token = create_access_token(user.id)

        # 프론트엔드 콜백 페이지로 토큰과 함께 리다이렉트
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/auth/callback?token={access_token}"
        )
    except social_auth_service.SocialAuthError as exc:
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error=auth_failed"
        )
    except NotImplementedError:
        return RedirectResponse(
            f"{settings.oauth_redirect_base}/login?error=not_implemented"
        )


@router.post("/{provider}/token", response_model=OAuthTokenResponse)
async def oauth_token(
    provider: AuthProvider, payload: OAuthCallbackRequest, db: DbSession
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
