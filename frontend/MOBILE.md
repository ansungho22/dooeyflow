# Dooeyflow 모바일 앱 (Capacitor)

웹 코드를 그대로 래핑해 iPhone/iPad용 Universal 앱으로 빌드한다.

## 사전 요구사항 (macOS)

- Xcode + Command Line Tools
- CocoaPods (`sudo gem install cocoapods` 또는 `brew install cocoapods`)
- Apple Developer 계정 (APNs 인증서/키, App Store 배포용)

## 최초 1회: iOS 프로젝트 생성

```bash
cd frontend
npm install
npm run build          # 정적 export → out/
npx cap add ios        # ios/ 네이티브 프로젝트 생성 (Xcode/CocoaPods 필요)
```

> `ios/` 디렉토리는 생성 후 버전 관리에 커밋한다 (Capacitor 권장).

## 반복 빌드 (웹 변경 반영)

```bash
npm run mobile:sync    # next build + cap sync ios
npm run mobile:open    # Xcode 열기 → 실기기/시뮬레이터 실행
```

## APNs 푸시 알림 설정

1. **Xcode**: 타깃 → Signing & Capabilities → **Push Notifications** капability 추가
2. **Apple Developer**: APNs Auth Key(.p8) 발급
3. **백엔드**: 발급한 키로 `notification_service`의 발송기를 실제 APNs 구현으로 교체
   (현재는 `LoggingPushSender` 스텁)
4. 앱은 `usePushRegistration` 훅에서 권한 요청 후 APNs 토큰을
   `POST /api/v1/stores/{id}/device-tokens` (platform=ios)로 등록한다.

## iPad

`appId`/`webDir` 동일한 Universal 앱으로 iPad에서도 동작한다. 반응형 레이아웃이
태블릿 폭(2단 구성 등)을 처리한다. App Store 제출 시 iPad 스크린샷을 별도 첨부한다.

## API 베이스 URL

네이티브 앱은 로컬호스트에 접근할 수 없으므로, 배포 시
`NEXT_PUBLIC_API_BASE_URL`을 실제 백엔드 도메인(HTTPS)으로 설정해 빌드한다.
