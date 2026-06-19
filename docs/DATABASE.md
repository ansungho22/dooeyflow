# Database Schema Reference

Dooeyflow PostgreSQL 스키마 레퍼런스입니다.  
모든 수량 컬럼은 `DECIMAL(12,4)` 타입으로 부동소수점 오차를 방지합니다.

> **마이그레이션**: `backend/alembic/versions/` 참고  
> **규칙**: 모든 비즈니스 데이터 테이블에 `store_id` FK를 추가하여 매장 간 데이터를 Row-Level로 격리합니다.

---

## 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `users` | 사장님 계정 |
| `stores` | 매장 |
| `materials` | 원자재/식자재 |
| `menus` | 판매 메뉴 |
| `recipes` | 메뉴-원자재 소모량 매핑 (BOM) |
| `inventory_transactions` | 재고 변동 감사 로그 |
| `toss_orders` | 토스 주문 처리 내역 (멱등성) |
| `device_tokens` | 푸시 알림 디바이스 토큰 |

---

## 테이블 상세

### `users`

사장님 계정. 이메일+비밀번호 또는 소셜 로그인 모두 지원.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 로그인 이메일 |
| `hashed_password` | VARCHAR(255) | NULLABLE | 소셜 로그인 사용자는 null |
| `full_name` | VARCHAR(100) | NULLABLE | |
| `is_active` | BOOLEAN | DEFAULT true | 계정 활성 상태 |
| `auth_provider` | VARCHAR(20) | NULLABLE | `apple` / `kakao` / `naver` / null(이메일) |
| `auth_provider_id` | VARCHAR(255) | NULLABLE | 소셜 제공자 고유 ID |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**유니크 제약**: `(auth_provider, auth_provider_id)` — 동일 소셜 계정 중복 가입 방지

---

### `stores`

매장. 멀티테넌시의 격리 단위. 한 사용자가 여러 매장을 보유할 수 있습니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `owner_id` | INTEGER | FK→users.id, NOT NULL | 매장 소유자 |
| `name` | VARCHAR(150) | NOT NULL | 매장명 |
| `toss_enabled` | BOOLEAN | DEFAULT false | 토스 POS 연동 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### `materials`

원자재/식자재 목록. 현재 재고와 안전 재고를 함께 관리합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `store_id` | INTEGER | FK→stores.id, NOT NULL | 매장 격리 키 |
| `name` | VARCHAR(150) | NOT NULL | 원자재명 (예: 우유) |
| `unit` | VARCHAR(20) | NOT NULL | 기본 저장 단위 (예: `ml`, `g`, `개`) |
| `current_stock` | DECIMAL(12,4) | DEFAULT 0 | 현재 재고량 |
| `safety_stock` | DECIMAL(12,4) | DEFAULT 0 | 안전 재고 임계값 |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**비즈니스 규칙**:
- 입력 단위가 `kg`/`L`이면 API 레이어에서 `g`/`ml`로 변환 후 저장
- `current_stock <= safety_stock` 이면 푸시 알림 발송 트리거

---

### `menus`

판매 메뉴. 토스 POS 메뉴 코드로 자동 차감 매핑을 지원합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `store_id` | INTEGER | FK→stores.id, NOT NULL | |
| `name` | VARCHAR(150) | NOT NULL | 메뉴명 (예: 아메리카노) |
| `price` | DECIMAL(12,2) | DEFAULT 0 | 판매 가격 (원) |
| `pos_menu_code` | VARCHAR(100) | NULLABLE, INDEX | 토스 POS 메뉴 식별자 |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### `recipes`

메뉴-원자재 매핑 (Bill of Materials). 메뉴 1개 판매 시 소모되는 원자재와 수량을 정의합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `store_id` | INTEGER | FK→stores.id, NOT NULL | |
| `menu_id` | INTEGER | FK→menus.id, NOT NULL | |
| `material_id` | INTEGER | FK→materials.id (RESTRICT), NOT NULL | 원자재 삭제 시 레시피 보호 |
| `quantity_per_unit` | DECIMAL(12,4) | NOT NULL | 메뉴 1개당 소모량 (예: 18.0000) |
| `instructions` | TEXT | NULLABLE | 조리 매뉴얼 텍스트 |
| `image_url` | TEXT | NULLABLE | 조리 가이드 이미지 URL |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**유니크 제약**: `(menu_id, material_id)` — 동일 메뉴-원자재 조합 중복 방지  
**참고**: `quantity_per_unit`의 단위는 해당 `material.unit`을 따릅니다.

---

### `inventory_transactions`

재고 변동 감사 로그. 모든 재고 변경은 이 테이블에 기록됩니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `store_id` | INTEGER | FK→stores.id, NOT NULL | |
| `material_id` | INTEGER | FK→materials.id, NOT NULL | |
| `quantity_changed` | DECIMAL(12,4) | NOT NULL | 변동량 (차감은 음수) |
| `reason_code` | VARCHAR(20) | NOT NULL | `SALE` / `WASTE` / `AUDIT` / `CANCEL` |
| `actor_id` | INTEGER | NULLABLE | 변경을 실행한 사용자 ID |
| `note` | TEXT | NULLABLE | 비고 |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**reason_code 값**:
- `SALE` — 판매로 인한 자동/수동 차감
- `WASTE` — 폐기 처리
- `AUDIT` — 실사(재고 조정)
- `CANCEL` — 취소/환불로 인한 복구

---

### `toss_orders`

토스 주문 처리 내역. 웹훅·폴링 중복 처리를 방지하는 멱등성 테이블입니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `store_id` | INTEGER | FK→stores.id, NOT NULL | |
| `toss_order_id` | VARCHAR(100) | UNIQUE, NOT NULL | 토스 주문 고유 ID (멱등성 키) |
| `status` | VARCHAR(20) | NOT NULL | 처리 상태 |
| `raw_payload` | JSONB | NULLABLE | 원본 웹훅 페이로드 |
| `processed_at` | TIMESTAMPTZ | NULLABLE | 재고 차감 완료 시각 |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**멱등성 보장**: `toss_order_id` UNIQUE 제약 + Redis 락으로 동일 주문의 이중 처리를 원천 차단합니다.

---

### `device_tokens`

푸시 알림 발송용 디바이스 토큰. 플랫폼별로 채널을 분기합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | |
| `store_id` | INTEGER | FK→stores.id, NOT NULL | |
| `user_id` | INTEGER | FK→users.id, NOT NULL | |
| `platform` | VARCHAR(10) | NOT NULL | `ios` / `web` |
| `token` | TEXT | NOT NULL | APNs 디바이스 토큰 또는 Web Push subscription |
| `is_active` | BOOLEAN | DEFAULT true | 만료/실패 토큰은 false |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**채널 분기 규칙**:
- `platform = ios` → APNs 네이티브 푸시 (1차, 백그라운드 신뢰성)
- `platform = web` → Web Push API (보조)

---

## ERD 요약

```
users ──< stores ──< materials
                 ──< menus ──< recipes >── materials
                 ──< inventory_transactions
                 ──< toss_orders
                 ──< device_tokens
users ──< device_tokens
```

- `users` : `stores` = 1 : N (한 사장님이 여러 매장 보유 가능)
- `stores` : `materials` = 1 : N
- `stores` : `menus` = 1 : N
- `menus` : `recipes` = 1 : N
- `recipes` : `materials` = N : 1 (RESTRICT — 재료 삭제 시 레시피가 있으면 거부)

---

## 마이그레이션 관리

```bash
# 현재 상태 확인
alembic current

# 최신 버전으로 업그레이드
alembic upgrade head

# 새 마이그레이션 자동 생성
alembic revision --autogenerate -m "add column xxx to materials"

# 한 단계 다운그레이드
alembic downgrade -1
```
