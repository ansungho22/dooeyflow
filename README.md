# Dooeyflow

요식업 매장을 위한 실시간 재고관리 플랫폼

## 개요

**Dooeyflow**는 중소규모 식당/카페 사장님을 위한 재고관리 솔루션입니다.

- **토스 POS 연동**: 웹훅을 통한 실시간 재고 자동 차감
- **레시피(BOM) 기반**: 메뉴 판매 시 원자재 정밀 소비 계산
- **멀티매장 지원**: Row-Level 격리로 매장별 데이터 분리
- **안전재고 알림**: 재고 부족 시 앱 푸시 알림

## 기술 스택

| 영역 | 기술 |
|------|------|
| **백엔드** | FastAPI + PostgreSQL + Redis + Alembic |
| **프론트엔드** | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| **모바일** | Capacitor (iOS Universal App) |
| **인프라** | Docker Compose |

## 빠른 시작

```bash
# 1. 인프라 실행
docker-compose up -d db redis

# 2. 백엔드 실행
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload

# 3. 프론트엔드 실행 (새 터미널)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 프로젝트 구조

```
dooeyflow/
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/v1/routes/ # API 엔드포인트
│   │   ├── models/        # SQLAlchemy 모델
│   │   ├── schemas/       # Pydantic 스키마
│   │   └── services/      # 비즈니스 로직
│   ├── alembic/           # DB 마이그레이션
│   └── tests/             # 테스트
├── frontend/              # Next.js 프론트엔드
│   └── src/
│       ├── app/           # 페이지 (App Router)
│       ├── components/    # React 컴포넌트
│       └── lib/           # 유틸리티, API 클라이언트
├── docs/                  # 문서
│   ├── PRD.md             # 요구사항 정의서
│   ├── implementation_plan.md  # 구현 계획
│   ├── CONTRIBUTING.md    # 개발 가이드
│   ├── ENV.md             # 환경변수 설정
│   └── API.md             # API 레퍼런스
└── docker-compose.yml     # 로컬 인프라
```

## 문서

- [PRD (요구사항)](docs/PRD.md)
- [구현 계획](docs/implementation_plan.md)
- [개발 가이드](docs/CONTRIBUTING.md)
- [환경변수 설정](docs/ENV.md)
- [API 레퍼런스](docs/API.md)

## 핵심 기능

### 구현 완료

- [x] 사용자 인증 (JWT)
- [x] 원자재 CRUD
- [x] 메뉴 및 레시피(BOM) 관리
- [x] 수동 일괄 판매 차감
- [x] 토스 웹훅 연동 (서명 검증 + 멱등성)
- [x] 토스 폴링 배치 (웹훅 유실 보완)
- [x] 안전재고 푸시 알림
- [x] Capacitor iOS 앱 래핑
- [x] kg/L → g/ml 단위 자동 변환

### 예정

- [ ] 소셜 로그인 (카카오, 네이버, 애플)
- [ ] App Store 배포
- [ ] 레시피 마켓 (Phase 2)

## 테스트

```bash
# 백엔드
cd backend && pytest --cov=app

# 프론트엔드
cd frontend && npm test
```

## 라이선스

Private - All rights reserved
