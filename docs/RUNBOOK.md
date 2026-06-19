# Runbook

Dooeyflow 운영 및 장애 대응 가이드입니다.

<!-- AUTO-GENERATED-RUNBOOK-START -->
## 배포 절차 (Deployment Procedures)

### 프로덕션 배포
1. `develop` 브랜치에서 `main` 브랜치로 PR 생성 및 병합
2. GitHub Actions (또는 설정된 CI/CD) 트리거 확인
3. 서버에서 자동 빌드 및 무중단 배포 진행 (Docker Compose)
   ```bash
   git pull origin main
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```
4. 백엔드 DB 마이그레이션 적용
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
   ```

## 롤백 절차 (Rollback Procedures)

배포 직후 치명적인 이슈 발견 시:
1. `main` 브랜치에서 직전 안정적인 커밋으로 revert PR 생성
2. 또는 서버에서 직접 이전 이미지/버전으로 강제 복구
   ```bash
   git reset --hard HEAD~1
   docker-compose -f docker-compose.prod.yml up -d
   ```
3. (필요 시) 데이터베이스 다운그레이드
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend alembic downgrade -1
   ```

## 헬스 체크 및 모니터링 (Health Check & Monitoring)

- **API Health Check**: `GET /api/v1/health` (서버 및 DB 연결 상태 반환)
- **모니터링**: 
  - (추가 예정) Sentry를 통한 백엔드/프론트엔드 에러 트래킹
  - (추가 예정) Datadog/Prometheus를 이용한 메트릭 수집

## 자주 발생하는 이슈 및 해결 방법 (Common Issues)

| 증상 | 원인 및 해결 방법 |
|------|-------------------|
| DB 연결 실패 (500 Error) | PostgreSQL 컨테이너 상태 확인 (`docker-compose ps`). 볼륨 권한 또는 설정(환경변수) 문제 확인. |
| 토스 웹훅 검증 실패 | `TOSS_WEBHOOK_SECRET` 환경 변수 값 재확인 및 토스 페이먼츠 개발자 콘솔 일치 여부 확인. |
| Redis Timeout | Redis 컨테이너 메모리 부족 혹은 연결 수 초과. 재시작 및 로그 확인 (`docker-compose logs redis`). |

## 알람 및 에스컬레이션 경로 (Alerting)

1. **1차 대응**: 서비스 모니터링 경고음 발생 시 On-Call 담당자 확인
2. **2차 대응**: 슬랙 `#alerts` 채널에 인시던트 리포트 
3. **에스컬레이션**: 심각도 CRITICAL(데이터 유실 위험, 결제 마비) 시 즉각 개발 리드 및 인프라 담당자 호출
<!-- AUTO-GENERATED-RUNBOOK-END -->
