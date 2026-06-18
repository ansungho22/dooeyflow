# dooeyflow — Gemini CLI 작업 지침

요식업 대상 실시간 재고관리 앱. Claude Code와 Gemini CLI를 번갈아 사용하는 협업 환경.
공유 하네스(`.claude/`)의 agents, skills, commands, rules를 함께 참조한다.

## 기술 스택
- **백엔드**: FastAPI + PostgreSQL + Alembic + Redis
- **프론트엔드**: Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
- **인프라**: Docker Compose, .env 기반 환경 분리

## 핵심 도메인 규칙
- 재고 수량은 `DECIMAL(12,4)` (부동소수점 오차 방지)
- 토스 웹훅: `orderId` 기반 Redis 멱등성 키 필수 (이중 차감 방지)
- 모든 재고 트랜잭션에 `reason_code` 기록: `SALE` / `WASTE` / `AUDIT` / `CANCEL`
- 모든 테이블에 `store_id FK` → 멀티매장 Row-Level 격리
- 감사 로그: 누가 언제 무엇을 수정했는지 전량 추적

## 코딩 표준
- 불변 업데이트 선호, 인플레이스 뮤테이션 지양
- 함수는 작게, 파일은 단일 책임
- 외부 입력은 경계에서 반드시 검증
- 시크릿 하드코딩 금지
- 조용히 삼키는 에러 금지 → 명확한 에러 메시지로 큰 소리로 실패

## 보안 체크리스트 (커밋 전 필수)
- API 키·패스워드·토큰 하드코딩 없음
- 모든 외부 입력 검증 완료
- DB 쓰기에 파라미터화된 쿼리 사용
- 민감한 경로에 인증·인가 확인
- 에러 메시지에 내부 정보 노출 없음
- 토스 웹훅 서명(HMAC) 검증 적용

## 작업 흐름
```
새 기능:   계획 수립 → 구현 → 코드 리뷰 → 보안 검토 → PR
DB 변경:   스키마 설계 선행 → Alembic 마이그레이션 → 구현
버그 수정: 재현 테스트 먼저 작성 → 수정 → 검증
커밋 전:   FastAPI 라우터 검토 + 보안 체크리스트 통과
```

## 공유 리소스 참조 (`.claude/` 디렉터리)

### Skills — 작업 유형별 깊은 가이드
| 작업 | 참조 스킬 |
|------|-----------|
| FastAPI 라우터·DI·미들웨어 | `.claude/skills/fastapi-patterns/SKILL.md` |
| REST API 설계·버저닝·문서화 | `.claude/skills/api-design/SKILL.md` |
| 백엔드 패턴·에러 핸들링 | `.claude/skills/backend-patterns/SKILL.md` |
| DB 마이그레이션·롤백 전략 | `.claude/skills/database-migrations/SKILL.md` |
| Next.js App Router·레이아웃 | `.claude/skills/frontend-patterns/SKILL.md` |
| React 훅·상태 관리 패턴 | `.claude/skills/react-patterns/SKILL.md` |
| Docker 멀티스테이지 빌드 | `.claude/skills/docker-patterns/SKILL.md` |
| TDD RED→GREEN→REFACTOR | `.claude/skills/tdd-workflow/SKILL.md` |
| Playwright E2E 테스트 | `.claude/skills/e2e-testing/SKILL.md` |
| 아키텍처 결정 기록(ADR) | `.claude/skills/architecture-decision-records/SKILL.md` |

### Rules — 항상 준수할 규칙
- `.claude/rules/common/` — 공통 보안·테스트·코딩스타일·git 워크플로
- `.claude/rules/python/fastapi.md` — FastAPI 전용 규칙
- `.claude/rules/python/security.md` — Python 보안 규칙
- `.claude/rules/typescript/` — Next.js/TS 규칙
- `.claude/rules/web/` — 웹 공통 규칙

### Agents — 전문 역할 참조
복잡한 작업 시 다음 에이전트 프롬프트를 참조해 역할 페르소나로 작업:
- `architect` / `code-architect` — 설계 결정
- `security-reviewer` — 보안 검토
- `database-reviewer` — DB 스키마 검토
- `fastapi-reviewer` — FastAPI 코드 검토
- `tdd-guide` — 테스트 주도 개발
- `performance-optimizer` — 성능 최적화

## 테스트 명령
```bash
cd backend && pytest --cov=app --cov-report=term-missing   # 목표: 80%+
cd frontend && npm test
npm run e2e
```

## 커밋 규칙
Conventional Commits: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Claude ↔ Gemini 협업 원칙
- 두 AI 모두 이 `GEMINI.md`와 `.claude/CLAUDE.md`를 기반으로 동일한 도메인 규칙 공유
- 한쪽이 결정한 아키텍처·DB 스키마는 ADR(`.claude/skills/architecture-decision-records/`)에 기록
- 코드 변경 후 항상 conventional commit으로 히스토리 추적
- 시크릿은 `.env` 파일에만, 절대 커밋 금지
