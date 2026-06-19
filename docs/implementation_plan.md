# Dooeyflow 시스템 아키텍처 및 구현 계획

확정된 PRD를 바탕으로, Dooeyflow의 기술 스택, 데이터베이스 구조, 핵심 로직 및 개발 순서를 설계한 구현 계획서입니다.

## User Review Required
> [!IMPORTANT]
> 본 설계는 Dooeyflow의 토대를 다지는 중요한 아키텍처 문서입니다.
> - **프론트엔드/백엔드 스택** 및 **DB ERD 구조**가 프로젝트의 개발 방향과 일치하는지 확인해 주세요.
> - 확인 후 승인해 주시면, 바로 개발 환경 세팅 및 코딩(Phase 1-1)에 착수하겠습니다.

## 1. 시스템 아키텍처 및 기술 스택

정해진 코딩 표준 및 시스템 환경에 맞춰 다음과 같은 스택을 사용합니다.

- **프론트엔드 (웹 + iPhone/iPad 앱)**: `Next.js 14 (App Router)` + `TypeScript` + `Tailwind CSS` + `shadcn/ui`
  - 반응형 웹으로 개발하여 데스크톱·모바일 브라우저를 모두 지원.
  - **앱 패키징**: `Capacitor`로 동일 웹 코드를 네이티브 쉘에 래핑하여 **iPhone/iPad Universal 앱**으로 빌드(App Store 배포). 웹과 앱이 단일 코드베이스를 공유한다.
  - **네이티브 플러그인**: Push(APNs), Preferences/Secure Storage(토큰 보관), Network(오프라인 감지) 등 Capacitor 플러그인으로 네이티브 기능 분기 처리.
- **백엔드 (API 서버)**: `FastAPI` (Python)
  - 높은 비동기 처리 성능을 바탕으로 토스 웹훅 및 대용량 트래픽 처리.
- **데이터베이스 (DB)**: `PostgreSQL` + `Alembic` (마이그레이션)
  - 재고 데이터의 무결성 및 소수점 정밀도(`DECIMAL(12,4)`) 완벽 보장.
- **캐시 및 큐**: `Redis`
  - 토스 웹훅의 이중 처리 방지(멱등성 키) 및 성능 최적화.
- **인프라**: `Docker Compose`
  - 프론트엔드, 백엔드, DB, Redis를 로컬 컨테이너로 띄워 환경 분리 및 개발 일치화.

## 2. 핵심 데이터베이스 설계 (ERD 요약)

> [!TIP]
> **멀티매장 및 보안 규칙 반영**
> - 모든 테이블에 `store_id` FK를 추가하여 Row-Level로 매장 간 데이터를 철저히 격리합니다.
> - 변동 내역은 엄격한 감사(Audit) 추적이 가능하도록 설계되었습니다.

1. **users / stores**: 사장님 계정 및 매장 테이블
2. **materials**: 원자재 목록
   - 이름, 단위, 안전재고량, 현재재고량(`DECIMAL(12,4)` 형태)
3. **menus**: 판매 메뉴 테이블
4. **recipes**: 메뉴-원자재 매핑 및 조리 매뉴얼
   - 매핑된 원자재 소모량(`DECIMAL`), 조리 가이드 텍스트 및 이미지 URL 포함
5. **inventory_transactions**: 재고 변동 감사 로그 테이블 (중요)
   - 필수 컬럼: `reason_code` (`SALE` / `WASTE` / `AUDIT` / `CANCEL`), `quantity_changed`, `actor_id` (누가 수정했는지)
6. **toss_orders**: 토스 주문 처리 내역
   - 동일 주문의 중복 처리를 막기 위한 기록 및 폴링 교차검증용
7. **device_tokens**: 푸시 알림 발송용 디바이스 토큰
   - `store_id`, `user_id`, `platform`(`ios` / `web`), `token`, 활성 여부
   - iPhone/iPad 앱(APNs)과 웹(Web Push)을 구분해 알림 채널 분기

## 3. 핵심 플로우 구현 전략

### 3.1. 토스 OpenAPI 연동 (투트랙 검증)
- **Webhook 처리**: 토스 서버로부터 `POST /api/v1/routes/webhooks.py` 로 주문 완료 데이터 수신.
  - 수신 즉시 Redis에 `orderId` 기반의 멱등성 키(Idempotency Key)를 세팅하여 이중 처리를 원천 차단.
- **Polling 배치**: 주기적으로 토스 API를 호출하여, 네트워크 장애로 누락된 웹훅 주문 건을 찾아내어 후속 처리.

### 3.2. 재고 자동/수동 차감 로직
- **로직 흐름**: 판매/일괄입력 이벤트 -> 메뉴별 연결된 `recipes` 조회 -> 원자재 총 소모량 합산 -> `materials` 재고 정밀 마이너스 연산.
- 데이터베이스 트랜잭션을 묶어 하나의 주문 건이 온전히 적용되거나 모두 롤백되도록 원자자성(Atomicity) 보장.

### 3.3. 알림 처리 (앱 푸시)
- 재고 변동 트랜잭션 성공 후, `materials`의 재고 수치가 안전재고 수치 밑으로 떨어졌는지 검사.
- 조건에 부합할 경우 비동기 백그라운드 태스크(FastAPI BackgroundTasks)를 통해 사장님 기기로 Push 알림 발송 트리거.
- **채널 분기**:
  - **iPhone/iPad 앱**: `device_tokens` 테이블에 저장된 APNs 토큰으로 네이티브 푸시 발송(1차 채널, 백그라운드 신뢰성 확보).
  - **웹 브라우저**: Web Push 구독 정보로 보조 발송.
- **디바이스 토큰 관리**: 앱/웹 로그인 시 디바이스 토큰을 등록(`device_tokens`: `store_id`, `user_id`, `platform`(ios/web), `token`)하고, 만료·실패 토큰은 정리.

## 4. 진행 단계 (Action Plan)

설계 승인이 완료되면 다음 순서로 작업을 진행합니다.

**1차 출시 전략**: 반응형 **웹을 먼저** 완성해 빠르게 검증하고, iPhone/iPad **앱은 Phase 1.5로 후속** 진행한다. 웹을 Capacitor로 래핑하는 구조이므로 앱 단계의 추가 작업은 네이티브 쉘·푸시·배포에 집중된다.

#### Phase 1 — 웹 + 백엔드 코어
- **Phase 1-1**: Docker Compose 기반 로컬 통합 환경(Next.js, FastAPI, PostgreSQL, Redis) 구축
- **Phase 1-2**: DB 스키마 설계 확정 및 Alembic 마이그레이션 생성 (`device_tokens` 포함)
- **Phase 1-3**: 백엔드 코어 API (매장/원자재/메뉴/레시피 CRUD) + 인증(JWT) 구현
- **Phase 1-4**: 수동 일괄 차감 로직 및 토스 연동(웹훅 서명검증/멱등성/폴링) 코어 로직 구현
- **Phase 1-5**: 반응형 프론트엔드 대시보드 구현 (데스크톱·모바일·iPad 레이아웃) + Web Push 알림 연동

#### Phase 1.5 — iPhone/iPad 앱
- **Phase 1.5-1**: Capacitor 도입 및 웹앱 네이티브 쉘 래핑(iOS 프로젝트 생성)
- **Phase 1.5-2**: APNs 연동 — 디바이스 토큰 등록 API + 백엔드 네이티브 푸시 발송 채널 구현
- **Phase 1.5-3**: 네이티브 보안 저장소(토큰)·오프라인 입력 재시도 등 모바일 UX 보강
- **Phase 1.5-4**: iPad Universal 레이아웃 점검 및 App Store 배포(TestFlight 베타 → 심사)
