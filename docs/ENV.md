# Environment Variables

Dooeyflow 환경 변수 설정 가이드입니다.

## 백엔드 (`backend/.env`)

<!-- AUTO-GENERATED-ENV-START -->

| 변수 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `ENVIRONMENT` | No | 실행 환경 (default: development) | `development`, `production` |
| `DEBUG` | No | 디버그 모드 (default: true) | `true`, `false` |
| `DATABASE_URL` | Yes | PostgreSQL 연결 문자열 (asyncpg) | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | Redis 연결 문자열 | `redis://redis:6379/0` |
| `JWT_SECRET_KEY` | Yes | JWT 서명용 시크릿 (운영 환경에서 반드시 안전한 난수로 교체) | `change-me-in-production` |
| `JWT_ALGORITHM` | No | JWT 알고리즘 (default: HS256) | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 토큰 만료 시간(분) (default: 1440 = 24시간) | `1440` |
| `TOSS_WEBHOOK_SECRET` | No | 토스 웹훅 서명 검증용 시크릿 | `(토스에서 발급)` |
| `APPLE_CLIENT_ID` | No | Apple 로그인 Client ID (Services ID) | `com.example.app` |
| `APPLE_TEAM_ID` | No | Apple 로그인 Team ID | `ABCD1234EF` |
| `APPLE_KEY_ID` | No | Apple 로그인 Key ID | `XYZ1234567` |
| `APPLE_PRIVATE_KEY` | No | Apple 로그인 Private Key (Base64 encoded .p8) | `(Apple Developer 발급)` |
| `KAKAO_CLIENT_ID` | No | 카카오 로그인 REST API 키 | `(카카오 개발자 콘솔 발급)` |
| `KAKAO_CLIENT_SECRET` | No | 카카오 로그인 Client Secret | `(카카오 개발자 콘솔 발급)` |
| `NAVER_CLIENT_ID` | No | 네이버 로그인 Client ID | `(네이버 개발자 센터 발급)` |
| `NAVER_CLIENT_SECRET` | No | 네이버 로그인 Client Secret | `(네이버 개발자 센터 발급)` |
| `OAUTH_REDIRECT_BASE` | No | OAuth 리다이렉트 베이스 URL (default: http://localhost:3000) | `https://app.dooeyflow.com` |

<!-- AUTO-GENERATED-ENV-END -->

### 예시 `.env` 파일

```env
# 앱
ENVIRONMENT=development
DEBUG=true

# 데이터베이스
DATABASE_URL=postgresql+asyncpg://dooeyflow:dooeyflow@db:5432/dooeyflow

# Redis
REDIS_URL=redis://redis:6379/0

# JWT (운영 환경에서는 반드시 안전한 난수로 교체)
JWT_SECRET_KEY=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 토스 웹훅 서명 검증 시크릿
TOSS_WEBHOOK_SECRET=

# 소셜 로그인 (선택)
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=http://localhost:3000
```

---

## 프론트엔드 (`frontend/.env.local`)

<!-- AUTO-GENERATED-FRONTEND-ENV-START -->

| 변수 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | 백엔드 API 베이스 URL | `http://localhost:8000` |

<!-- AUTO-GENERATED-FRONTEND-ENV-END -->

### 예시 `.env.local` 파일

```env
# 백엔드 API 베이스 URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Docker Compose 환경

Docker Compose 실행 시 `docker-compose.yml`에 정의된 기본값이 사용됩니다:

| 서비스 | 변수 | 기본값 |
|--------|------|--------|
| PostgreSQL | `POSTGRES_USER` | `dooeyflow` |
| PostgreSQL | `POSTGRES_PASSWORD` | `dooeyflow` |
| PostgreSQL | `POSTGRES_DB` | `dooeyflow` |

---

## 보안 주의사항

1. **JWT_SECRET_KEY**: 운영 환경에서는 반드시 32자 이상의 안전한 난수로 교체
   ```bash
   # 시크릿 키 생성 예시
   openssl rand -hex 32
   ```

2. **TOSS_WEBHOOK_SECRET**: 토스 웹훅 서명 검증에 사용되므로 절대 노출 금지

3. **소셜 로그인 시크릿**:
   - `APPLE_PRIVATE_KEY`: Apple Developer에서 다운로드한 .p8 파일을 Base64 인코딩하여 저장
   - `KAKAO_CLIENT_SECRET`, `NAVER_CLIENT_SECRET`: 각 개발자 콘솔에서 발급받은 시크릿 키

4. **민감 정보 관리**:
   - `.env` 파일은 절대 Git에 커밋하지 않음 (`.gitignore`에 포함됨)
   - 운영 환경에서는 시크릿 매니저 사용 권장
