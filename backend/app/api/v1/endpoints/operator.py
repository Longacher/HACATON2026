"""Рабочее место оператора (ТЗ 4.2, 4.4)."""

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.models import (
    Appeal,
    AppealStatus,
    Category,
    CoExecutor,
    Message,
    Transfer,
    User,
)
from app.schemas.api import ProcessItem, RejectRequest, ReturnResolution
from app.schemas.appeal import AppealBrief, AppealDetail
from app.services.appeals import log_status, utcnow
from app.services.auth import require_role
from app.services.routing import available_experts, category_hint

router = APIRouter(prefix="/operator", dependencies=[Depends(require_role("operator"))])
settings = get_settings()
STALL_HOURS = 24
OVERDUE_URGENT_HOURS = 1


@router.get("/queue")
def queue(db: Session = Depends(get_db)):
    """Очередь новых: старые сверху, срочные первыми, кризисные отдельным блоком."""
    new_statuses = [AppealStatus.new, AppealStatus.returned]
    appeals = db.execute(
        select(Appeal)
        .where(Appeal.status.in_(new_statuses))
        .order_by(
            Appeal.is_crisis.desc(),
            Appeal.priority.desc(),
            Appeal.return_count.desc(),
            Appeal.created_at.asc(),
        )
    ).scalars().all()
    upcoming = []
    for a in appeals:
        upcoming.append(_brief_dict(db, a))
    return {
        "items": upcoming,
        "overdue_count": _overdue_count(db),
    }


@router.get("/appeals/{appeal_id}")
def operator_appeal_detail(appeal_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    return _detail_dict(db, a)


@router.post("/appeals/{appeal_id}/process")
def process(appeal_id: uuid.UUID, payload: ProcessItem, db: Session = Depends(get_db), user: User = Depends(require_role("operator"))):
    """Оператор: уточнить категорию, приоритет, назначить исполнителя / закрыть / отклонить."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    a.operator_id = a.operator_id or user.id
    if payload.category_id is not None:
        a.category_id = payload.category_id
    a.priority = payload.priority

    if payload.action == "assign":
        if not payload.expert_id:
            raise HTTPException(400, "Укажите исполнителя")
        a.responsible_expert_id = payload.expert_id
        a.operator_taken_at = a.operator_taken_at or utcnow()
        log_status(db, a, AppealStatus.assigned, comment="Оператор назначил исполнителя")
    elif payload.action == "priority":
        a.operator_taken_at = a.operator_taken_at or utcnow()
        log_status(db, a, a.status, comment=f"Приоритет изменён на {payload.priority.value}")
    elif payload.action == "category":
        a.operator_taken_at = a.operator_taken_at or utcnow()
        log_status(db, a, a.status, comment="Оператор уточнил категорию")
    elif payload.action == "close":
        a.operator_taken_at = a.operator_taken_at or utcnow()
        log_status(db, a, AppealStatus.completed, comment="Оператор закрыл обращение сам")
        a.closed_at = utcnow()
    elif payload.action == "reject":
        reason = (payload.reason or "").strip() or "«Помочь с этим не сможем, вот куда ещё можно обратиться»"
        log_status(db, a, AppealStatus.rejected, comment=reason)
        a.closed_at = utcnow()

    db.commit()
    db.refresh(a)
    from app.services.appeals import publish_status_event
    publish_status_event(db, a)
    return a


@router.post("/appeals/{appeal_id}/return-resolution")
def resolve_return(appeal_id: uuid.UUID, payload: ReturnResolution, db: Session = Depends(get_db), user: User = Depends(require_role("operator"))):
    """Возвращённое обращение: переназначить или закрыть (ТЗ 5.1)."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    a.operator_id = a.operator_id or user.id
    if payload.action == "reassign":
        if not payload.expert_id:
            raise HTTPException(400, "Укажите исполнителя")
        a.responsible_expert_id = payload.expert_id
        log_status(db, a, AppealStatus.assigned, comment=payload.explanation or "Переназначено оператором")
    elif payload.action == "close":
        log_status(db, a, AppealStatus.completed, comment=payload.explanation or "Закрыто оператором")
        a.closed_at = utcnow()
    db.commit()
    db.refresh(a)
    return a


@router.post("/appeals/{appeal_id}/transfer-resolve")
def resolve_transfer(appeal_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), user: User = Depends(require_role("operator"))):
    """ТЗ 4.4: оператор подтверждает передачу и назначает нового ответственного."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    t = db.execute(
        select(Transfer).where(Transfer.appeal_id == a.id, Transfer.resolved.is_(False))
    ).scalars().first()
    if not t:
        raise HTTPException(400, "Нет открытых запросов передачи")
    t.resolved = True
    t.resolved_by = user.id
    t.resolved_at = utcnow()
    if payload.get("new_expert_id"):
        a.responsible_expert_id = payload["new_expert_id"]
        log_status(db, a, AppealStatus.assigned, actor=user, comment=f"Передача подтверждена: {t.reason}")
    db.commit()
    return {"ok": True}


@router.post("/appeals/{appeal_id}/complaint-seen")
def complaint_seen(appeal_id: uuid.UUID, db: Session = Depends(get_db)):
    """Оператор отметил жалобу просмотренной (ТЗ 5.1: жалоба уходит оператору)."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    a.complain_seen_by_operator = True
    db.commit()
    return {"ok": True}


@router.get("/hint/{appeal_id}")
def hint(appeal_id: uuid.UUID, db: Session = Depends(get_db)):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    return category_hint(db, a)


@router.get("/distributed")
def distributed(db: Session = Depends(get_db)):
    """Контроль: распределённые обращения с текущими статусами + зависшие > N часов."""
    active = [
        AppealStatus.assigned, AppealStatus.in_progress,
        AppealStatus.need_clarification, AppealStatus.answer_ready,
    ]
    rows = db.execute(
        select(Appeal).where(Appeal.status.in_(active), Appeal.operator_id.isnot(None))
    ).scalars().all()
    now = utcnow()
    items = []
    stalled = 0
    for a in rows:
        d = _brief_dict(db, a)
        idle = now - (a.last_client_activity_at or a.created_at)
        hours = idle.total_seconds() / 3600
        d["idle_hours"] = round(hours, 1)
        d["photo"] = None  # текст переписки оператору не показывается (ТЗ 4.2)
        if hours > STALL_HOURS:
            stalled += 1
        items.append(d)
    return {"items": items, "stalled_count": stalled}


def _is_overdue(a) -> bool:
    age_h = (utcnow() - (a.last_client_activity_at or a.created_at)).total_seconds() / 3600
    if a.priority.value == "urgent" or a.is_crisis:
        return age_h > OVERDUE_URGENT_HOURS
    return age_h > STALL_HOURS


def _overdue_count(db: Session) -> int:
    new_statuses = [AppealStatus.new, AppealStatus.returned]
    appeals = db.execute(
        select(Appeal).where(Appeal.status.in_(new_statuses))
    ).scalars().all()
    return sum(1 for a in appeals if _is_overdue(a))


def _brief_dict(db, a) -> dict:
    wait_h = (utcnow() - (a.last_client_activity_at or a.created_at)).total_seconds() / 3600
    return {
        "id": str(a.id),
        "track_number": a.track_number,
        "status": a.status.value,
        "priority": a.priority.value,
        "is_crisis": a.is_crisis,
        "created_at": a.created_at.isoformat(),
        "category_id": str(a.category_id) if a.category_id else None,
        "applicant_type": a.applicant_type.value,
        "excerpt": (a.free_text or "")[:120],
        "return_reason": a.return_reason,
        "has_complaint": bool(a.complain_about_expert),
        "complaint_seen": bool(a.complain_seen_by_operator),
        "wait_hours": round(wait_h, 1),
        "is_overdue": _is_overdue(a),
    }


def _detail_dict(db, a) -> dict:
    # ТЗ 2.2: оператор видит только исходный текст. Переписка заявителя
    # с экспертом ему недоступна — даже через API.
    notes = [{"id": str(n.id), "text": n.text} for n in a.notes]
    return {
        **_brief_dict(db, a),
        "text": a.free_text,
        "answers": a.answers,
        "hint": category_hint(db, a),
        "messages": [],
        "notes": notes,
        "expert": {"id": str(a.responsible_expert_id)} if a.responsible_expert_id else None,
        "transfers": [{"reason": t.reason, "resolved": t.resolved} for t in a.transfers],
        "complaint": ({"text": a.complain_text, "seen": bool(a.complain_seen_by_operator)}
                      if a.complain_about_expert else None),
        "contact": ({"name": a.contact_name, "value": a.contact_value}
                    if a.contact_consent and a.is_crisis else None),
        "attachments": [{"filename": at.filename, "size_bytes": at.size_bytes,
                           "url": f"/files/{os.path.basename(at.stored_path)}"} for at in a.attachments],
    }
