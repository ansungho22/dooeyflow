"""공통 FastAPI 의존성: 현재 사용자 인증 및 매장 소유권 검증."""

from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.store import Store
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="인증에 실패했습니다.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    subject = decode_access_token(token)
    if subject is None:
        raise _CREDENTIALS_EXC
    user = await db.get(User, int(subject))
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_owned_store(
    store_id: Annotated[int, Path()],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Store:
    """경로의 store_id가 현재 사용자 소유인지 검증한다 (멀티매장 격리)."""
    store = await db.get(Store, store_id)
    if store is None or store.owner_id != current_user.id:
        # 존재 여부를 숨기기 위해 소유자가 아니어도 404로 응답
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="매장을 찾을 수 없습니다."
        )
    return store


OwnedStore = Annotated[Store, Depends(get_owned_store)]
