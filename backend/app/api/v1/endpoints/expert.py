"""Рабочее место эксперта (ТЗ 4.3, 4.4)."""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Appeal,
    AppealStatus,
    CoExecutor,
    InternalNote,
    Message,
    Transfer,
    User,
)
from app.schemas.api import StatusChange, TransferRequest, TransferResolve
from app.schemas.appeal import MessageCreate
from app.services.appeals import add_chat_message, log_status, utcnow
from app.services.auth import require_role
from app.services.chat_hub import chat_hub, message_payload

router = APIRouter(prefix="/expert", dependencies=[Depends(require_role("expert"))])


def _assert_access(a: Appeal, user: User):
    if a.responsible_expert_id != user.id:
        # соисполнитель тоже может читать/писать
        is_co = True in [
            1 for c in a.co_executors if c.user_id == user.id
        ] if a.co_executors else False
        if not is_co:
            raise HTTPException(403, "Обращение не назначено вам")
    return


@router.get("/colleagues")
def colleagues(db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    """Коллеги-эксперты для подключения соисполнителем (без контактов — только имена)."""
    rows = db.execute(
        select(User).where(User.role == "expert", User.active.is_(True), User.id != user.id)
    ).scalars().all()
    return [{"id": str(u.id), "display_name": u.display_name or u.username} for u in rows]


@router.get("/appeals")
def my_appeals(
    status: AppealStatus | None = None,
    priority: str | None = None,
    category_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("expert")),
):
    """Только назначенные, срочные всегда сверху (ТЗ 4.3)."""
    q = select(Appeal).where(
        (Appeal.responsible_expert_id == user.id)
        | (Appeal.id.in_(select(CoExecutor.appeal_id).where(CoExecutor.user_id == user.id)))
    )
    if status:
        q = q.where(Appeal.status == status)
    if priority:
        q = q.where(Appeal.priority == priority)
    if category_id:
        q = q.where(Appeal.category_id == category_id)
    rows = db.execute(
        q.order_by(Appeal.priority.desc(), Appeal.created_at.asc())
    ).scalars().all()
    result = []
    for a in rows:
        d = {
            "id": str(a.id),
            "status": a.status.value,
            "priority": a.priority.value,
            "is_crisis": a.is_crisis,
            "created_at": a.created_at.isoformat(),
            "applicant_type": a.applicant_type.value,
            "text": a.free_text,
            "answers": a.answers,
            "is_responsible": a.responsible_expert_id == user.id,
        }
        result.append(d)
    return result


@router.get("/appeals/{appeal_id}")
def appeal_detail(appeal_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    _assert_access(a, user)
    msgs = [
        {"author_type": m.author_type, "text": m.text, "created_at": m.created_at.isoformat()}
        for m in a.messages
    ]
    notes = [{"id": str(n.id), "text": n.text, "author_user_id": str(n.author_user_id) if n.author_user_id else None} for n in a.notes]
    co = []
    for c in a.co_executors:
        u = db.get(User, c.user_id)
        co.append({"user_id": str(c.user_id), "display_name": (u.display_name or u.username) if u else None})
    atts = [{"filename": at.filename, "size_bytes": at.size_bytes,
             "url": f"/files/{os.path.basename(at.stored_path)}"} for at in a.attachments]
    return {
        "id": str(a.id),
        "status": a.status.value,
        "priority": a.priority.value,
        "text": a.free_text,
        "answers": a.answers,
        "messages": msgs,
        "notes": notes,
        "co_executors": co,
        "applicant_type": a.applicant_type.value,
        "attachments": atts,
        "transfers": [{"reason": t.reason, "resolved": t.resolved} for t in a.transfers],
        "viewers": chat_hub.viewers(str(a.id)),
    }


@router.post("/appeals/{appeal_id}/take")
def take_appeal(appeal_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    if a.status == AppealStatus.assigned and a.responsible_expert_id == user.id:
        log_status(db, a, AppealStatus.in_progress, actor=user, comment="Эксперт взял в работу")
        a.taken_at = a.taken_at or utcnow()
        db.commit()
        db.refresh(a)
    return a


@router.post("/appeals/{appeal_id}/status")
def change_status(appeal_id: uuid.UUID, payload: StatusChange, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    _assert_access(a, user)
    allowed = {
        AppealStatus.in_progress,
        AppealStatus.need_clarification,
        AppealStatus.answer_ready,
    }
    if payload.to_status not in allowed:
        raise HTTPException(400, "Такой статус эксперт менять не может")
    log_status(db, a, payload.to_status, actor=user, comment=payload.comment)
    if payload.to_status == AppealStatus.answer_ready and a.first_expert_reply_at is None:
        a.first_expert_reply_at = utcnow()
    db.commit()
    db.refresh(a)
    return a


@router.post("/appeals/{appeal_id}/message")
async def send_message(appeal_id: uuid.UUID, payload: MessageCreate, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    _assert_access(a, user)
    msg = add_chat_message(db, a, "specialist", user, payload.text)
    if a.first_expert_reply_at is None:
        a.first_expert_reply_at = utcnow()
    db.commit()
    db.refresh(msg)
    await chat_hub.broadcast(str(a.id), message_payload(msg))
    return msg


@router.post("/appeals/{appeal_id}/note")
def add_note(appeal_id: uuid.UUID, payload: MessageCreate, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    """Внутренняя заметка — заявителю не видна (ТЗ 4.3/4.4)."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    _assert_access(a, user)
    note = InternalNote(
        appeal_id=a.id, author_user_id=user.id, text=payload.text, created_at=utcnow()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": str(note.id), "text": note.text}


@router.post("/appeals/{appeal_id}/co-executor")
def add_co_executor(appeal_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    if a.responsible_expert_id != user.id:
        raise HTTPException(403, "Добавлять может ответственный эксперт")
    co_id = payload.get("expert_id")
    if not co_id:
        raise HTTPException(400, "Укажите соисполнителя")
    db.add(CoExecutor(appeal_id=a.id, user_id=co_id, added_by=user.id, created_at=utcnow()))
    db.commit()
    return {"ok": True}


@router.post("/appeals/{appeal_id}/request-transfer")
def request_transfer(appeal_id: uuid.UUID, payload: TransferRequest, db: Session = Depends(get_db), user: User = Depends(require_role("expert"))):
    """Запрос передачи: подтверждает оператор (ТЗ 4.4)."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    if a.responsible_expert_id != user.id:
        raise HTTPException(403, "Запросить передачу может ответственный эксперт")
    db.add(Transfer(appeal_id=a.id, requested_by=user.id, reason=payload.reason, created_at=utcnow()))
    db.commit()
    return {"ok": True}
