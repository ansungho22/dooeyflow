"""애플리케이션 설정. 모든 환경값은 환경변수/.env에서 로드한다 (시크릿 하드코딩 금지)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # 앱 메타
    app_name: str = "dooeyflow"
    environment: str = Field(default="development")
    debug: bool = Field(default=False)

    # 데이터베이스
    database_url: str = Field(
        default="postgresql+asyncpg://dooeyflow:dooeyflow@localhost:5432/dooeyflow"
    )

    # Redis (멱등성 키 / 캐시)
    redis_url: str = Field(default="redis://localhost:6379/0")

    # 인증 (JWT)
    jwt_secret_key: str = Field(default="change-me-in-production")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60 * 24)

    # 토스 웹훅 서명 검증
    toss_webhook_secret: str = Field(default="")

    # CORS 허용 출처 (쉼표 구분). 개발 시 프론트엔드 dev 서버 허용.
    cors_origins: str = Field(default="http://localhost:3000")

    # 소셜 로그인 - Apple
    apple_client_id: str = Field(default="")
    apple_team_id: str = Field(default="")
    apple_key_id: str = Field(default="")
    apple_private_key: str = Field(default="")  # Base64 encoded .p8 key

    # 소셜 로그인 - Kakao
    kakao_client_id: str = Field(default="")
    kakao_client_secret: str = Field(default="")

    # 소셜 로그인 - Naver
    naver_client_id: str = Field(default="")
    naver_client_secret: str = Field(default="")

    # 소셜 로그인 공통
    oauth_redirect_base: str = Field(default="http://localhost:3000")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
