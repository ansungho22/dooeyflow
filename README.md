# Dooeyflow

요식업 매장 사장님을 위한 실시간 재고 관리 플랫폼.  
토스 플레이스 POS 연동으로 판매 즉시 재고가 자동 차감되고, 안전재고 미달 시 앱 푸시 알림을 발송합니다.

## 주요 기능

- **재고 자동 차감** — 토스 POS 웹훅/폴링으로 판매 즉시 재고 차감 (멱등성 보장)
- **수동 일괄 판매 입력** — POS 미연동 매장을 위한 일괄 차감 플로우
- **레시피(BOM) 관리** — 메뉴별 원자재 소모량 매핑 + 조리 매뉴얼
- **안전재고 푸시 알림** — 재고 부족 시 APNs(iOS)/Web Push 알림
- **소셜 로그인** — 카카오·네이버·Apple (App Store 요구사항 대응)
- **iOS/iPad 앱** — Capacitor로 동일 코드베이스를 네이티브 앱으로 래핑

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| 모바일 | Capacitor (iOS/iPadOS Universal 앱) |
| 백엔드 | FastAPI · Python 3.11 |
| DB | PostgreSQL 16 · Alembic (마이그레이션) |
| 캐시/멱등성 | Redis 7 |
| 인프라 | Docker Compose |

## 빠른 시작

### 필수 조건

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### 로컬 실행

```bash
# 1. 인프라 실행 (PostgreSQL + Redis)
docker-compose up -d db redis

# 2. 백엔드
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env          # 환경 변수 설정
alembic upgrade head          # DB 마이그레이션
uvicorn app.main:app --reload

# 3. 프론트엔드 (새 터미널)
cd frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

### 접속 URL

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

## 문서

| 문서 | 설명 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항 정의서 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처 및 데이터 플로우 |
| [docs/DATABASE.md](docs/DATABASE.md) | DB 스키마 레퍼런스 (ERD) |
| [docs/API.md](docs/API.md) | API 엔드포인트 레퍼런스 |
| [docs/ENV.md](docs/ENV.md) | 환경 변수 설정 가이드 |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | 개발 환경 설정 및 기여 가이드 |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | 배포 및 장애 대응 가이드 |
| [frontend/MOBILE.md](frontend/MOBILE.md) | iOS 앱 빌드 및 배포 가이드 |

## 브랜치 전략

```
main        ← 프로덕션 배포 브랜치
develop     ← 통합 개발 브랜치
feature/*   ← 기능 개발 브랜치 (develop으로 PR)
```

## 라이선스

Private — 외부 공개 금지
