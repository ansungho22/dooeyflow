# 운영 배포 전 설정 가이드

로컬 개발은 `docker-compose up` 만으로 동작합니다.  
**운영 환경 또는 소셜 로그인·POS 연동을 활성화하려면 아래 항목들을 설정해야 합니다.**

환경변수 전체 목록은 [ENV.md](./ENV.md)를 참고하세요.

---

## 1. JWT 시크릿 키 교체 (필수)

기본값 `change-me-in-production`은 운영에 절대 사용하지 마세요.

```bash
openssl rand -hex 32
```

생성된 값을 `backend/.env`의 `JWT_SECRET_KEY`에 설정합니다.

---

## 2. 카카오 로그인

### 필요한 값
- `KAKAO_CLIENT_ID` — REST API 키
- `KAKAO_CLIENT_SECRET` — 클라이언트 시크릿

### 설정 절차
1. [카카오 개발자 콘솔](https://developers.kakao.com) 접속 → 내 애플리케이션 → 애플리케이션 추가
2. **앱 키** 탭 → **REST API 키** 복사 → `KAKAO_CLIENT_ID`에 설정
3. **보안** 탭 → 클라이언트 시크릿 코드 활성화 후 복사 → `KAKAO_CLIENT_SECRET`에 설정
4. **카카오 로그인** 탭 → 활성화 ON
5. **Redirect URI** 추가:
   - 개발: `http://localhost:8000/api/v1/oauth/kakao/callback`
   - 운영: `https://your-domain.com/api/v1/oauth/kakao/callback`
6. **동의항목**: 닉네임, 이메일(선택) 활성화

---

## 3. 네이버 로그인

### 필요한 값
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

### 설정 절차
1. [네이버 개발자 센터](https://developers.naver.com) → 애플리케이션 → 애플리케이션 등록
2. **사용 API**: 네이버 로그인 선택
3. **서비스 URL**: 앱 도메인 입력
4. **Callback URL** 추가:
   - 개발: `http://localhost:8000/api/v1/oauth/naver/callback`
   - 운영: `https://your-domain.com/api/v1/oauth/naver/callback`
5. 발급된 **Client ID / Client Secret** → `.env`에 설정

---

## 4. Apple Sign In

> iOS App Store 배포 시 필수입니다.

### 필요한 값
- `APPLE_CLIENT_ID` — Services ID (예: `com.yourcompany.dooeyflow`)
- `APPLE_TEAM_ID` — Apple Developer Team ID (10자리)
- `APPLE_KEY_ID` — Sign In with Apple 키 ID
- `APPLE_PRIVATE_KEY` — `.p8` 파일 내용을 Base64 인코딩한 값

### 설정 절차
1. [Apple Developer](https://developer.apple.com) → Certificates, IDs & Profiles
2. **Identifiers** → Services IDs → 신규 생성
   - Description: `Dooeyflow Web`
   - Identifier: `com.yourcompany.dooeyflow.web`
   - Sign In with Apple 체크 → Configure → Return URL 입력:
     - `https://your-domain.com/api/v1/oauth/apple/callback`
3. **Keys** → 새 키 생성 → Sign In with Apple 체크 → 다운로드 (`.p8`)
4. `.p8` 파일을 Base64 인코딩:
   ```bash
   base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n'
   ```
5. 결과를 `APPLE_PRIVATE_KEY`에 설정

---

## 5. 토스 POS 웹훅

> 매장에서 토스 POS를 사용하고 실시간 매출 연동을 원할 때 필요합니다.

### 필요한 값
- `TOSS_WEBHOOK_SECRET`

### 설정 절차
1. 토스 파트너사 계약 후 토스 담당자에게 웹훅 등록 요청
2. 웹훅 URL: `https://your-domain.com/api/v1/webhooks/toss`
3. 발급된 시크릿 → `TOSS_WEBHOOK_SECRET`에 설정
4. 앱의 설정 화면 → **토스 연동 활성화** 토글 ON

> 웹훅 없이도 수동 판매 입력(판매입력 탭)으로 재고 차감이 가능합니다.

---

## 6. iOS 푸시 알림 (APNs)

> Capacitor로 빌드한 iOS 앱에서 저재고 알림을 받으려면 필요합니다.

### 설정 절차
1. Apple Developer → Certificates → APNs 인증서 또는 키 생성
2. 백엔드 `app/services/push_service.py`에서 APNs 설정 확인
3. 웹 푸시는 VAPID 키가 필요합니다 (현재 미구현 — 향후 추가 예정)

---

## 7. CORS 설정

운영 환경에서는 프론트엔드 도메인만 허용하도록 설정하세요.

`backend/.env`에서:
```env
CORS_ORIGINS=https://your-domain.com
```

> 개발 환경 기본값은 `http://localhost:3000`입니다.

---

## 8. 로컬 개발 빠른 시작

소셜 로그인 없이 이메일 로그인만으로도 전체 기능을 테스트할 수 있습니다.

```bash
# 1. 의존성 설치 및 서버 시작
cd backend
cp .env.example .env   # 기본값으로 동작
docker-compose up -d db redis
uv run uvicorn app.main:app --reload --port 8000

# 2. 프론트엔드
cd frontend
cp .env.local.example .env.local  # 없으면 NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install && npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 이메일로 회원가입 → 매장 생성 → 전체 기능 사용 가능.
