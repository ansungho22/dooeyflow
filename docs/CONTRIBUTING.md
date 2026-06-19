# Contributing to Dooeyflow

요식업 재고관리 앱 Dooeyflow 개발 가이드입니다.

## 개발 환경 설정

### 필수 조건

- **Docker & Docker Compose**: 로컬 인프라 실행
- **Python 3.11+**: 백엔드 개발
- **Node.js 18+**: 프론트엔드 개발
- **pnpm** (권장) 또는 npm: 패키지 관리

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd dooeyflow

# 2. 인프라 실행 (PostgreSQL + Redis)
docker-compose up -d db redis

# 3. 백엔드 설정
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload

# 4. 프론트엔드 설정 (새 터미널)
cd frontend
npm install  # 또는 pnpm install
cp .env.example .env.local
npm run dev
```

### 접속 URL

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8000 |
| API 문서 (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 스크립트 레퍼런스

<!-- AUTO-GENERATED-SCRIPTS-START -->

### 백엔드 (Python/FastAPI)

| 명령어 | 설명 |
|--------|------|
| `uvicorn app.main:app --reload` | 개발 서버 실행 (핫 리로드) |
| `pytest` | 테스트 실행 (커버리지 포함) |
| `pytest --cov=app --cov-report=term-missing` | 상세 커버리지 리포트 |
| `ruff check .` | 린트 검사 |
| `ruff format .` | 코드 포매팅 |
| `alembic upgrade head` | DB 마이그레이션 적용 |
| `alembic revision --autogenerate -m "message"` | 새 마이그레이션 생성 |

### 프론트엔드 (Next.js)

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (핫 리로드) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run test` | Vitest 테스트 실행 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run mobile:sync` | Capacitor iOS 빌드 동기화 |
| `npm run mobile:open` | Xcode 프로젝트 열기 |

### Docker Compose

| 명령어 | 설명 |
|--------|------|
| `docker-compose up -d` | 전체 스택 백그라운드 실행 |
| `docker-compose up -d db redis` | 인프라만 실행 |
| `docker-compose down` | 컨테이너 중지 및 제거 |
| `docker-compose logs -f backend` | 백엔드 로그 확인 |

<!-- AUTO-GENERATED-SCRIPTS-END -->

---

## 테스트

### 백엔드 테스트

```bash
cd backend

# 전체 테스트 실행 (커버리지 포함)
pytest

# 특정 파일만 실행
pytest tests/test_inventory.py

# 특정 테스트만 실행
pytest tests/test_inventory.py::test_deduct_inventory_on_sale -v
```

**커버리지 목표**: 80% 이상

### 프론트엔드 테스트

```bash
cd frontend

# 테스트 실행
npm run test

# 감시 모드
npm run test -- --watch
```

---

## 코드 스타일

### 백엔드 (Python)

- **린터/포매터**: Ruff
- **라인 길이**: 100자
- **타입 힌트**: 필수
- **Python 버전**: 3.11+

```bash
# 린트 + 자동 수정
ruff check . --fix
ruff format .
```

### 프론트엔드 (TypeScript)

- **린터**: ESLint (Next.js 설정)
- **포매터**: Prettier (권장)
- **TypeScript**: strict 모드

```bash
npm run lint
npm run typecheck
```

---

## PR 체크리스트

- [ ] 관련 테스트 작성/수정
- [ ] 백엔드: `pytest` 통과
- [ ] 프론트엔드: `npm run lint && npm run typecheck` 통과
- [ ] 커밋 메시지가 Conventional Commits 형식 준수
- [ ] PR 설명에 변경 사항 요약 포함

### 커밋 메시지 형식

```
<type>: <description>

예시:
feat: 재고 자동 차감 로직 구현
fix: 웹훅 서명 검증 오류 수정
refactor: inventory_service 코드 정리
docs: API 문서 업데이트
test: 폴링 서비스 테스트 추가
```

**타입**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
