# dooeyflow — 요식업 재고관리 앱

## 프로젝트 개요
요식업 매장 대상 실시간 재고관리 플랫폼. 토스 POS 웹훅 연동으로 판매 발생 시 재고 자동 차감, BOM 기반 원재료 소비 계산, 멀티매장 지원.

## 기술 스택
- **백엔드**: FastAPI + PostgreSQL + Alembic + Redis
- **프론트엔드**: Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
- **인프라**: Docker Compose (로컬 개발), .env 기반 환경 분리

## 핵심 도메인 규칙
- 재고 수량은 DB 레벨 `DECIMAL(12,4)` 사용 (부동소수점 오차 방지)
- 토스 웹훅 처리 시 `orderId` 기반 Redis 멱등성 키 필수 (이중 차감 방지)
- 모든 재고 트랜잭션에 `reason_code` 기록: `SALE` / `WASTE` / `AUDIT` / `CANCEL`
- 모든 테이블에 `store_id FK` → Row-Level 멀티매장 격리
- 감사 로그: 누가 언제 어떤 재고를 수정했는지 전량 추적

## 에이전트 사용 지침

### 아키텍처 & 계획
- `architect` — 시스템·DB 설계, 모듈 분리 결정
- `code-architect` — 코드 레벨 구조·패턴 설계
- `planner` — 새 기능 구현 계획 수립 (`/plan` 커맨드)
- `chief-of-staff` — 복잡한 멀티에이전트 작업 조율

### 품질 & 보안
- `code-reviewer` — 모든 PR 전 코드 품질 게이트
- `security-reviewer` — 인증·권한·웹훅 서명 검증 필수 통과
- `database-reviewer` — 스키마 변경·마이그레이션 선행 검토
- `tdd-guide` — RED→GREEN→REFACTOR 사이클 지도
- `silent-failure-hunter` — 숨겨진 버그·예외 탐지

### 분석 & 운영
- `code-explorer` — 코드베이스 탐색 및 파악
- `performance-optimizer` — API 응답·쿼리 성능 분석
- `e2e-runner` — Playwright E2E 테스트 실행
- `doc-updater` — README·API 문서 자동 업데이트

### 스택별 리뷰어
- `fastapi-reviewer` — 라우터·의존성 주입·미들웨어 검토
- `python-reviewer` — Python 코드 품질·타입 힌트 검토
- `typescript-reviewer` — Next.js/TS 타입 안전성 검토
- `react-reviewer` — React 컴포넌트·훅 패턴 검토

## 표준 작업 흐름

```
새 기능:   /plan → architect → 구현 → code-reviewer → security-reviewer → PR
DB 변경:   database-reviewer 선행 → /plan → Alembic migration → 구현
버그 수정: silent-failure-hunter → code-explorer → 수정 → tdd-guide
커밋 전:   /fastapi-review (백엔드) 또는 /react-review (프론트) + /quality-gate
```

## 테스트 명령
```bash
# 백엔드 (목표: 80% 커버리지)
cd backend && pytest --cov=app --cov-report=term-missing

# 프론트엔드
cd frontend && npm test

# E2E
npm run e2e
```

## 커밋 규칙
Conventional Commits 준수: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## 주요 모듈 (구현 후 업데이트 예정)
- `backend/app/api/v1/routes/webhooks.py` — 토스 웹훅 수신 → 재고 차감
- `backend/app/services/inventory_service.py` — FIFO·재고 차감 핵심 로직
- `backend/app/services/recipe_service.py` — BOM 기반 원재료 소비 계산
