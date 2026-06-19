# Dooeyflow Backend

요식업 재고관리 앱 Dooeyflow의 백엔드 API 서버입니다.

## 기술 스택

- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy (async)
- **Migration**: Alembic
- **Cache**: Redis
- **Auth**: JWT (python-jose)
- **Testing**: pytest + pytest-asyncio

## 시작하기

### 필수 조건

- Python 3.11+
- PostgreSQL 16+
- Redis 7+

### 설치 및 실행

```bash
# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 패키지 설치 (개발 의존성 포함)
pip install -e ".[dev]"

# 환경변수 설정
cp .env.example .env

# DB 마이그레이션 적용
alembic upgrade head

# 개발 서버 실행
uvicorn app.main:app --reload
```

- **API 서버**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `uvicorn app.main:app --reload` | 개발 서버 실행 |
| `pytest` | 테스트 실행 (커버리지 포함) |
| `pytest -v` | 상세 테스트 출력 |
| `ruff check .` | 린트 검사 |
| `ruff check . --fix` | 린트 자동 수정 |
| `ruff format .` | 코드 포매팅 |
| `alembic upgrade head` | 마이그레이션 적용 |
| `alembic revision --autogenerate -m "msg"` | 마이그레이션 생성 |

## 프로젝트 구조

```
app/
├── api/
│   ├── deps.py             # 의존성 주입 (DB 세션, 현재 사용자)
│   └── v1/
│       ├── router.py       # 라우터 집합
│       └── routes/
│           ├── auth.py         # 인증 (회원가입, 로그인)
│           ├── materials.py    # 원자재 CRUD
│           ├── menus.py        # 메뉴/레시피 CRUD
│           ├── inventory.py    # 재고 차감, 이력 조회
│           ├── notifications.py # 푸시 토큰 등록
│           ├── webhooks.py     # 토스 웹훅 수신
│           └── polling.py      # 토스 폴링 배치
├── core/
│   ├── config.py           # 환경설정 (pydantic-settings)
│   ├── database.py         # DB 세션 팩토리
│   └── security.py         # JWT, 비밀번호 해싱
├── models/                 # SQLAlchemy 모델
│   ├── base.py             # 공통 베이스 모델
│   ├── user.py             # 사용자
│   ├── store.py            # 매장
│   ├── material.py         # 원자재
│   ├── menu.py             # 메뉴
│   ├── recipe.py           # 레시피 (BOM)
│   ├── inventory_transaction.py  # 재고 변동 이력
│   ├── toss_order.py       # 토스 주문 (멱등성)
│   └── device_token.py     # 푸시 토큰
├── schemas/                # Pydantic 스키마
├── services/               # 비즈니스 로직
│   ├── auth_service.py     # 인증
│   ├── material_service.py # 원자재
│   ├── menu_service.py     # 메뉴/레시피
│   ├── inventory_service.py    # 재고 차감
│   ├── webhook_service.py      # 웹훅 처리
│   ├── polling_service.py      # 폴링 처리
│   ├── notification_service.py # 푸시 알림
│   └── toss_client.py          # 토스 API 클라이언트
└── main.py                 # FastAPI 앱 진입점

alembic/
└── versions/               # 마이그레이션 파일

tests/                      # 테스트
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | Yes | PostgreSQL 연결 문자열 |
| `REDIS_URL` | Yes | Redis 연결 문자열 |
| `JWT_SECRET_KEY` | Yes | JWT 서명 시크릿 |
| `TOSS_WEBHOOK_SECRET` | No | 토스 웹훅 서명 검증 |

자세한 내용은 [docs/ENV.md](../docs/ENV.md) 참조

## 테스트

```bash
# 전체 테스트 (커버리지 포함)
pytest

# 특정 파일
pytest tests/test_inventory.py

# 특정 테스트
pytest tests/test_inventory.py::test_deduct_inventory_on_sale -v

# 커버리지 HTML 리포트
pytest --cov=app --cov-report=html
```

**커버리지 목표**: 80%+

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 |
| GET | `/api/v1/materials` | 원자재 목록 |
| POST | `/api/v1/materials` | 원자재 등록 |
| GET | `/api/v1/menus` | 메뉴 목록 |
| POST | `/api/v1/menus` | 메뉴 등록 |
| POST | `/api/v1/menus/{id}/recipes` | 레시피 추가 |
| POST | `/api/v1/inventory/batch-sale` | 수동 일괄 차감 |
| POST | `/api/v1/webhooks/toss` | 토스 웹훅 |
| POST | `/api/v1/polling/sync` | 토스 폴링 |

자세한 내용은 [docs/API.md](../docs/API.md) 또는 Swagger UI 참조

## 코드 스타일

- **Linter/Formatter**: Ruff
- **Line Length**: 100
- **Python Version**: 3.11+

```bash
# 린트 + 포맷
ruff check . --fix
ruff format .
```
