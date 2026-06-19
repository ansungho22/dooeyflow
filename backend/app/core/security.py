"""인증 유틸: 비밀번호 해싱, JWT 발급/검증, 웹훅 서명 검증."""

import hashlib
import hmac
from datetime import UTC, datetime, timedelta

import jwt
from jwt import InvalidTokenError
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | int, expires_minutes: int | None = None) -> str:
    """subject(보통 user id)를 담은 JWT 액세스 토큰 발급."""
    expire = datetime.now(UTC) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """토큰을 검증하고 subject를 반환한다. 실패 시 None."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except (InvalidTokenError, Exception):
        return None
    return payload.get("sub")


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    """토스 웹훅 서명(HMAC-SHA256)을 검증한다.

    raw_body는 가공 전 원본 바이트여야 한다. 타이밍 공격 방지를 위해
    상수 시간 비교(compare_digest)를 사용한다.
    """
    secret = settings.toss_webhook_secret
    if not secret or not signature:
        return False
    expected = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
