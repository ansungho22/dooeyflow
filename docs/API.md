# API Reference

Dooeyflow 백엔드 API 엔드포인트 레퍼런스입니다.

> **Swagger UI**: 개발 서버 실행 후 http://localhost:8000/docs 에서 대화형 문서 확인 가능

## Base URL

```
http://localhost:8000/api/v1
```

---

## 인증 (Auth)

### POST `/api/v1/auth/register`
회원가입

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "store_name": "매장 이름"
}
```

### POST `/api/v1/auth/login`
로그인 (JWT 토큰 발급)

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

---

## 원자재 (Materials)

### GET `/api/v1/materials`
원자재 목록 조회

**Headers:** `Authorization: Bearer <token>`

### POST `/api/v1/materials`
원자재 등록

**Request Body:**
```json
{
  "name": "우유",
  "unit": "ml",
  "current_stock": 5000,
  "safety_stock": 1000
}
```

### PATCH `/api/v1/materials/{material_id}`
원자재 수정

### DELETE `/api/v1/materials/{material_id}`
원자재 삭제

---

## 메뉴 (Menus)

### GET `/api/v1/menus`
메뉴 목록 조회 (레시피 포함)

### POST `/api/v1/menus`
메뉴 등록

**Request Body:**
```json
{
  "name": "아메리카노",
  "price": 4500
}
```

### POST `/api/v1/menus/{menu_id}/recipes`
메뉴에 레시피(BOM) 추가

**Request Body:**
```json
{
  "material_id": 1,
  "quantity": 18,
  "unit": "g"
}
```

### DELETE `/api/v1/menus/{menu_id}`
메뉴 삭제 (연결된 레시피도 함께 삭제)

---

## 재고 (Inventory)

### POST `/api/v1/inventory/batch-sale`
수동 일괄 판매 차감

**Request Body:**
```json
{
  "sales": [
    {"menu_id": 1, "quantity": 5},
    {"menu_id": 2, "quantity": 3}
  ]
}
```

### GET `/api/v1/inventory/transactions`
재고 변동 이력 조회

---

## 알림 (Notifications)

### POST `/api/v1/notifications/register-token`
푸시 알림 디바이스 토큰 등록

**Request Body:**
```json
{
  "token": "apns-device-token",
  "platform": "ios"
}
```

---

## 웹훅 (Webhooks)

### POST `/api/v1/webhooks/toss`
토스 주문 웹훅 수신

> 토스 POS에서 호출되는 엔드포인트입니다. 웹훅 서명 검증 후 재고 자동 차감을 수행합니다.

---

## 폴링 (Polling)

### POST `/api/v1/polling/sync`
토스 폴링 배치 실행 (웹훅 유실 보완)

> 관리자 또는 스케줄러에서 호출하여 누락된 주문을 동기화합니다.

---

## 응답 형식

### 성공 응답
```json
{
  "id": 1,
  "name": "아메리카노",
  "price": 4500,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 에러 응답
```json
{
  "detail": "에러 메시지"
}
```

### HTTP 상태 코드

| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 생성됨 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 422 | 유효성 검사 실패 |
| 500 | 서버 에러 |
