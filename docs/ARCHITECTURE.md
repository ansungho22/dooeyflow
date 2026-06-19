# System Architecture

Dooeyflow 시스템 아키텍처 및 핵심 데이터 플로우 문서입니다.

---

## 전체 구성도

```
┌─────────────────────────────────────────────────────────┐
│                       클라이언트                         │
│                                                         │
│   ┌─────────────────┐      ┌──────────────────────┐    │
│   │  Next.js 웹앱   │      │  Capacitor iOS 앱    │    │
│   │  (브라우저)     │      │  (App Store)         │    │
│   └────────┬────────┘      └──────────┬───────────┘    │
│            └──────────┬───────────────┘                │
└───────────────────────┼────────────────────────────────┘
                        │ HTTPS / REST API
                        ▼
┌───────────────────────────────────────────────────────┐
│                   FastAPI 백엔드                       │
│                                                       │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐  │
│   │  Auth  │  │Material│  │  Menu  │  │Inventory │  │
│   │ /OAuth │  │  API   │  │/Recipe │  │   API    │  │
│   └────────┘  └────────┘  └────────┘  └──────────┘  │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐  │
│   │Webhook │  │Polling │  │Notif.  │  │  Store   │  │
│   │  API   │  │  API   │  │  API   │  │   API    │  │
│   └────────┘  └────────┘  └────────┘  └──────────┘  │
└───────────┬────────────────────────┬──────────────────┘
            │                        │
     ┌──────▼──────┐         ┌───────▼──────┐
     │ PostgreSQL  │         │    Redis     │
     │  (영구저장)  │         │  (멱등성 키) │
     └─────────────┘         └──────────────┘

외부 연동:
  토스 POS ──웹훅──▶ FastAPI
  FastAPI ──폴링──▶ 토스 OpenAPI
  FastAPI ──푸시──▶ APNs (iOS)
  FastAPI ──푸시──▶ Web Push (브라우저)
  카카오/네이버/Apple OAuth ◀──▶ FastAPI
```

---

## 레이어 구조

### 프론트엔드 (`frontend/`)

```
src/
├── app/
│   ├── (app)/             # 인증 필요 페이지 (레이아웃 공유)
│   │   ├── dashboard/     # 재고 현황 대시보드
│   │   ├── menus/         # 메뉴·레시피 관리
│   │   ├── sales/         # 수동 일괄 판매 입력
│   │   └── settings/      # 매장 설정
│   ├── auth/              # 인증 페이지 (로그인/회원가입)
│   └── login/
├── components/            # 공유 UI 컴포넌트
└── lib/                   # API 클라이언트, 유틸리티
```

**단일 코드베이스 원칙**: Capacitor가 Next.js 빌드 결과물(`out/`)을 iOS 네이티브 쉘에 로드합니다. 웹과 앱이 동일 코드를 공유합니다.

### 백엔드 (`backend/app/`)

라우터는 기능별로 분리되었으며, `/api/v1` 기본 경로에서 `store_id`를 포함하는 구조입니다.

```
app/
├── api/v1/
│   ├── router.py          # 라우터 통합 (모든 라우터 마운트)
│   ├── routes/            # 라우터 (HTTP 레이어)
│   │   ├── auth.py        # 회원가입, 로그인 → /auth
│   │   ├── oauth.py       # 소셜 로그인 → /oauth/{provider}
│   │   ├── stores.py      # 매장 CRUD → /stores, /stores/{store_id}
│   │   ├── materials.py   # 원자재 → /stores/{store_id}/materials
│   │   ├── menus.py       # 메뉴·레시피 → /stores/{store_id}/menus
│   │   ├── inventory.py   # 판매·이력 → /stores/{store_id}/inventory
│   │   ├── notifications.py # 토큰 → /stores/{store_id}/device-tokens
│   │   ├── webhooks.py    # 웹훅 → /webhooks/toss
│   │   └── polling.py     # 폴링 → /stores/{store_id}/toss
│   └── deps.py            # 의존성 (인증 미들웨어)
├── models/                # SQLAlchemy ORM 모델
├── schemas/               # Pydantic 요청/응답 스키마
├── services/              # 비즈니스 로직 (재고, 주문, 푸시 등)
├── core/                  # DB 연결, 설정, 보안 유틸
└── tests/                 # 단위 테스트 (pytest)
```

**라우터 설계 원칙:**
- 인증이 필요한 모든 엔드포인트는 `store_id` 경로 파라미터를 포함
- 현재 사용자는 자신의 매장에만 접근 가능 (JWT에서 추출한 user_id로 검증)
- 인증이 필요 없는 엔드포인트: `/auth/register`, `/auth/login`, `/oauth/{provider}/start`, `/oauth/{provider}/callback`, `/webhooks/toss`

---

## 핵심 데이터 플로우

### 1. 토스 웹훅 자동 재고 차감

```
토스 POS 주문 발생
  │ POST /api/v1/webhooks/toss
  ▼
서명 검증 (HMAC-SHA256)
  │ 실패 → 400 반환
  ▼
Redis 멱등성 키 확인 (toss_order_id)
  │ 이미 존재 → 200 즉시 반환 (중복 무시)
  ▼
toss_orders 테이블에 주문 기록
  ▼
메뉴 코드(pos_menu_code)로 메뉴 조회
  ▼
메뉴별 recipes 조회
  ▼
원자재별 총 소모량 계산
  ▼
materials.current_stock 차감 (DB 트랜잭션)
  ▼
inventory_transactions 감사 로그 기록 (reason_code=SALE)
  ▼
안전재고 미달 여부 확인
  │ 미달 → BackgroundTask: device_tokens 조회 → APNs/Web Push 발송
  ▼
200 ACK 반환 (즉시)
  │
  └─ (비동기) 푸시 알림 발송
```

**멱등성 보장:**
- Redis와 DB 유니크 제약 (`toss_order_id`)으로 이중 처리 원천 차단
- 웹훅 재시도 시에도 같은 주문 ID로 안전하게 처리

### 2. 수동 일괄 판매 입력

```
사장님 (프론트엔드)
  │ POST /api/v1/stores/{store_id}/inventory/batch-sale
  │ { "sales": [{"menu_id": 1, "quantity": 5}, ...] }
  ▼
[권한 검증] store_id가 현재 사용자의 매장인지 확인
  ▼
각 메뉴의 recipes 조회
  ▼
원자재별 총 소모량 = quantity_per_unit × 판매량
  ▼
materials.current_stock 차감 (단일 DB 트랜잭션 — 원자성 보장)
  ▼
inventory_transactions 로그 기록 (reason_code=SALE)
  ▼
안전재고 미달 시 푸시 알림 발송 (백그라운드)
  ▼
200 OK 반환
```

**안전성:**
- 트랜잭션 내 모든 원자재 차감이 원자적으로 처리됨
- 한 원자재라도 실패하면 모두 롤백

### 3. 토스 폴링 정합성 복구

```
스케줄러 (또는 관리자)
  │ POST /api/v1/stores/{store_id}/toss/sync
  ▼
[권한 검증] store_id가 현재 사용자의 매장인지 확인
  ▼
토스 OpenAPI에서 최근 주문 목록 조회
  ▼
toss_orders 테이블과 비교
  │ 처리되지 않은 주문 발견
  ▼
웹훅 플로우와 동일하게 재고 차감 처리
  (멱등성 키로 이중 차감 방지)
  ▼
완료 로그 기록
```

**용도:**
- 웹훅 유실 시 누락된 주문 보완
- POS와 앱의 재고 정합성 복구
- 수동 동기화가 필요한 경우 활용

### 4. 소셜 로그인 (OAuth 2.0)

```
클라이언트
  │ GET /api/v1/oauth/{provider}/start
  ▼
{ authorization_url, state } 반환
  ▼
클라이언트 → 소셜 제공자 페이지로 리다이렉트
  ▼
소셜 제공자 → GET /api/v1/oauth/{provider}/callback?code=...
  ▼
백엔드: code로 소셜 제공자에서 사용자 정보 획득
  ▼
users 테이블에서 (auth_provider, auth_provider_id)로 조회
  │ 없으면 → 신규 user 생성
  ▼
JWT 토큰 생성
  ▼
프론트엔드로 리다이렉트 (token 포함)
```

### 5. 푸시 알림 채널 분기

```
안전재고 미달 감지 (재고 차감 후)
  ▼
해당 store_id의 device_tokens 조회 (is_active=true)
  ▼
플랫폼별 발송
  │
  ├─ platform='ios'
  │    └─ APNs (Apple Push Notification service)
  │       • 백그라운드 알림 수신 가능
  │       • 신뢰성 높음 (App Store 요구사항)
  │
  └─ platform='web'
       └─ Web Push API (브라우저 알림)
          • 사파리 미지원 (iOS 제약)
          • 데스크톱 Chrome/Firefox 대응
```

**현재 상태:**
- APNs 통합: 구현 계획 중 (아직 미연동)
- Web Push: 인프라 준비 단계
- 기본 알림: 앱 내 배너/토스트로 제공

---

## 멀티테넌시 격리

모든 API는 JWT에서 추출한 `user_id`로 해당 사용자의 `store_id` 범위만 접근합니다.

```python
# deps.py — 인증 미들웨어
async def get_current_user(token: str) -> User:
    user_id = decode_jwt(token)
    return await db.get(User, user_id)

# 각 라우터에서 store_id 범위로 쿼리
materials = await db.query(Material).filter(
    Material.store_id.in_(user.store_ids)
)
```

타 매장 데이터에 접근 시 404 또는 403을 반환합니다.

---

## 재고 수량 정밀도

소수점 계산 오류(부동소수점 이슈)를 방지하기 위해:

- DB 컬럼: `DECIMAL(12,4)` (최대 12자리, 소수점 4자리)
- Python: `Decimal` 타입 사용 (`float` 사용 금지)
- 단위 변환: kg→g (`×1000`), L→ml (`×1000`) — API 레이어에서 처리

---

## 비동기 처리

FastAPI의 `BackgroundTasks`를 활용해 푸시 알림 발송을 재고 차감 트랜잭션과 분리합니다.

```
재고 차감 (동기, DB 트랜잭션)
  │
  ├─ inventory_transactions 로그 기록
  │
  └─ 200 ACK 반환 (즉시)
       │
       ▼ (비동기 백그라운드, 응답과 분리)
       device_tokens 조회
         │
         ├─ APNs 발송 시도
         └─ Web Push 발송 시도
         
       (실패해도 이미 ACK 반환됨)
```

**장점:**
- 웹훅 응답 지연 최소화 (토스 POS의 재시도 방지)
- 알림 발송 실패가 재고 차감에 영향 없음
- 대량 주문 시에도 빠른 응답 보장

---

## 테스트 커버리지

**백엔드 (pytest):**
- 단위 테스트: auth, inventory, materials, menus, webhooks, notifications 등
- 통합 테스트: DB 트랜잭션, 웹훅 멱등성 검증
- E2E: 웹훅 재시도 시나리오, 단위 변환 검증
- 커버리지: ≥80%

**프론트엔드 (Playwright):**
- E2E 테스트: 21개
  - 인증 (회원가입, 로그인, 로그아웃)
  - 대시보드 (재고 현황, 안전재고 알림)
  - 메뉴 관리 (CRUD, 레시피 설정)
  - 수동 판매 입력
  - 매장 설정 (토스 연동, 웹훅 URL 복사)
  - 소셜 로그인 (mock)

---

## 성능 최적화

**DB 쿼리 최적화:**
- N+1 쿼리 방지: inventory_service에서 명시적 eager loading
- material_service: `SELECT`에서 필드 명시 (불필요한 컬럼 제외)

**캐싱 전략:**
- Redis: 웹훅 멱등성 키 (TTL=24시간)
- 향후 추가 예정: 자주 조회하는 메뉴/원자재 목록
