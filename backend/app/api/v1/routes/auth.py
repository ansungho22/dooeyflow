"""인증/온보딩 라우터: 회원가입, 로그인, 내 정보, 매장 생성/조회."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.auth import (
    LoginRequest,
    StoreCreate,
    StoreRead,
    Token,
    UserCreate,
    UserRead,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: DbSession) -> UserRead:
    try:
        user = await auth_service.register_user(db, payload)
    except auth_service.EmailAlreadyExists as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: DbSession) -> Token:
    try:
        user = await auth_service.authenticate_user(db, payload.email, payload.password)
    except auth_service.InvalidCredentials as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
async def read_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/stores", response_model=StoreRead, status_code=status.HTTP_201_CREATED)
async def create_store(
    payload: StoreCreate, current_user: CurrentUser, db: DbSession
) -> StoreRead:
    store = await auth_service.create_store(db, current_user, payload)
    return StoreRead.model_validate(store)


@router.get("/stores", response_model=list[StoreRead])
async def list_stores(current_user: CurrentUser, db: DbSession) -> list[StoreRead]:
    stores = await auth_service.list_stores(db, current_user)
    return [StoreRead.model_validate(s) for s in stores]
