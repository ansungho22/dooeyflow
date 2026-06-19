# Dooeyflow Frontend

요식업 재고관리 앱 Dooeyflow의 프론트엔드입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Mobile**: Capacitor (iOS)

## 시작하기

### 필수 조건

- Node.js 18+
- npm 또는 pnpm
- 백엔드 서버 실행 중 (http://localhost:8000)

### 설치 및 실행

```bash
# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env.local

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (핫 리로드) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint 검사 |
| `npm run test` | Vitest 테스트 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run mobile:sync` | Capacitor iOS 동기화 |
| `npm run mobile:open` | Xcode 열기 |

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # 인증 필요 레이아웃
│   │   ├── dashboard/      # 대시보드
│   │   ├── materials/      # 원자재 관리
│   │   ├── menus/          # 메뉴 관리
│   │   └── sales/          # 판매 입력
│   ├── login/              # 로그인 페이지
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 랜딩 페이지
├── components/
│   ├── dashboard/          # 대시보드 컴포넌트
│   ├── menus/              # 메뉴 컴포넌트
│   ├── sales/              # 판매 컴포넌트
│   └── ui/                 # 공통 UI 컴포넌트
└── lib/
    ├── api.ts              # API 클라이언트
    ├── types.ts            # TypeScript 타입
    ├── units.ts            # 단위 변환 유틸
    ├── useAuth.ts          # 인증 훅
    ├── useStore.ts         # 매장 데이터 훅
    └── StoreContext.tsx    # 매장 컨텍스트
```

## 환경변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 백엔드 API URL | `http://localhost:8000` |

## 모바일 앱 (Capacitor)

### iOS 빌드

```bash
# 웹 빌드 + iOS 동기화
npm run mobile:sync

# Xcode 열기
npm run mobile:open
```

자세한 내용은 [MOBILE.md](./MOBILE.md) 참조

## 주요 기능

- **대시보드**: 재고 현황, 안전재고 경고
- **원자재 관리**: CRUD, 단위 설정
- **메뉴 관리**: 메뉴 등록, 레시피(BOM) 설정
- **판매 입력**: 수동 일괄 차감
- **인증**: JWT 기반 로그인/회원가입

## 코드 스타일

```bash
# 린트 검사
npm run lint

# 타입 검사
npm run typecheck
```
