"""토스 웹훅 수신 라우터.

공개 엔드포인트이므로 JWT 대신 HMAC 서명으로 신뢰성을 검증한다.
서명 검증을 위해 가공 전 원본 바이트(raw body)를 사용한다.
"""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.idempotency import IdempotencyStore, get_idempotency_store
from app.core.security import verify_webhook_signature
from app.schemas.webhook import TossWebhookPayload, WebhookAck
from app.services import webhook_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

DbSession = Annotated[AsyncSession, Depends(get_db)]
Idempotency = Annotated[IdempotencyStore, Depends(get_idempotency_store)]


@router.post("/toss", response_model=WebhookAck)
async def receive_toss_webhook(
    request: Request,
    db: DbSession,
    idempotency: Idempotency,
    x_toss_signature: Annotated[str | None, Header()] = None,
) -> WebhookAck:
    raw_body = await request.body()

    # 1) 서명 검증 (가공 전 원본 바이트 기준)
    if not verify_webhook_signature(raw_body, x_toss_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="서명 검증 실패"
        )

    # 2) 페이로드 파싱/검증
    try:
        payload = TossWebhookPayload.model_validate(json.loads(raw_body))
    except (ValidationError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="잘못된 페이로드"
        ) from exc

    # 3) 멱등 처리
    try:
        result_status = await webhook_service.process_webhook(db, idempotency, payload)
    except webhook_service.DuplicateOrder:
        # 중복은 오류가 아니다. 토스에 200으로 ACK하여 재시도를 멈추게 한다.
        return WebhookAck(order_id=payload.order_id, status="duplicate")

    return WebhookAck(order_id=payload.order_id, status=result_status)
