"""Персонал: логин, очередь оператора, карточка эксперта, заметки, передача."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import make_token, need, pwd
from ..db import get_db
from ..models import (
    Appeal, Audit, Message, Note, Priority, Role, RoutingRule, Status, User,
)

router = APIRouter()


@router.post("/api/login")
def login(payload: dict, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(login=payload.get("login")).first()
    if not u or not pwd.verify(payload.get("password", ""), u.pwd_hash):
        raise HTTPException(401, "Неверный логин или пароль")
    return {"token": make_token(u), "role": u.role.value, "login": u.login}


def _serialize_operator(a: Appeal):
    return {
        "id": a.id, "text": a.text, "answers": a.answers, "files": a.files,
        "status": a.status.value, "priority": a.priority.value,
        "crisis": a.crisis, "applicant": a.applicant.value,
        "assignee": a.assignee.login if a.assignee else None,
    }


@router.get("/api/operator/queue")
def queue(user: User = Depends(need(Role.operator, Role.admin)), db: Session = Depends(get_db)):
    rows = (
        db.query(Appeal).filter_by(status=Status.new)
        .order_by(Appeal.crisis.desc(), Appeal.created_at).all()
    )
    return [_serialize_operator(a) for a in rows]


@router.get("/api/operator/control")
def control(user: User = Depends(need(Role.operator, Role.admin)), db: Session = Depends(get_db)):
    """Распределённые, без текстов переписки (п.4.2)."""
    rows = db.query(Appeal).filter(Appeal.status.notin_([Status.new, Status.done])).all()
    return [
        {"id": a.id, "status": a.status.value, "priority": a.priority.value,
         "assignee": a.assignee.login if a.assignee else None,
         "updated": a.updated_at.isoformat()}
        for a in rows
    ]


@router.post("/api/operator/appeals/{aid}/assign")
def assign(aid: int, payload: dict, user: User = Depends(need(Role.operator, Role.admin)),
           db: Session = Depends(get_db)):
    a = db.query(Appeal).get(aid)
    if not a:
        raise HTTPException(404, "Нет такого обращения")
    expert = db.query(User).get(payload.get("expert_id"))
    if not expert or expert.role != Role.expert:
        raise HTTPException(422, "Исполнитель должен быть экспертом")
    a.assignee_id = expert.id
    a.status = Status.assigned
    if payload.get("priority"):
        a.priority = Priority(payload["priority"])
    if payload.get("category_id"):
        a.category_id = payload["category_id"]
    expert.active_load += 1
    db.add(Audit(appeal_id=a.id, actor=user.login, action=f"assign->{expert.login}"))
    db.commit()
    return {"ok": True, "hint": "Решение за человеком — подсказка системы лишь рекомендация"}


@router.post("/api/operator/appeals/{aid}/close")
def op_close(aid: int, payload: dict, user: User = Depends(need(Role.operator, Role.admin)),
             db: Session = Depends(get_db)):
    a = db.query(Appeal).get(aid)
    reason = payload.get("reason", "")
    if payload.get("spam"):
        a.status = Status.rejected
    else:
        a.status = Status.done
    db.add(Audit(appeal_id=a.id, actor=user.login, action=f"op_close: {reason}"))
    db.commit()
    return {"ok": True}


@router.get("/api/operator/suggest/{aid}")
def suggest(aid: int, user: User = Depends(need(Role.operator, Role.admin)),
            db: Session = Depends(get_db)):
    """Подсказка по правилу «категория — группа», решение за человеком."""
    a = db.query(Appeal).get(aid)
    rule = db.query(RoutingRule).filter_by(category_id=a.category_id).first() if a else None
    if not rule:
        return {"group": None, "free": []}
    free = (
        db.query(User).filter_by(role=Role.expert, profile=rule.group)
        .order_by(User.active_load).limit(3).all()
    )
    return {"group": rule.group,
            "free": [{"id": u.id, "login": u.login, "load": u.active_load} for u in free]}


@router.get("/api/expert/mine")
def mine(user: User = Depends(need(Role.expert)), db: Session = Depends(get_db)):
    rows = (
        db.query(Appeal).filter_by(assignee_id=user.id)
        .order_by(Appeal.priority != Priority.urgent, Appeal.updated_at).all()
    )
    return [{"id": a.id, "status": a.status.value, "priority": a.priority.value,
             "text": a.text[:200], "crisis": a.crisis} for a in rows]


@router.get("/api/expert/appeals/{aid}")
def card(aid: int, user: User = Depends(need(Role.expert)), db: Session = Depends(get_db)):
    a = db.query(Appeal).filter_by(id=aid, assignee_id=user.id).first()
    if not a:
        raise HTTPException(404, "Не назначено тебе")
    msgs = [{"author": m.author, "text": m.text, "at": m.created_at.isoformat()}
            for m in db.query(Message).filter_by(appeal_id=a.id).order_by(Message.id)]
    notes = [{"by": n.author_id, "text": n.text} for n in db.query(Note).filter_by(appeal_id=a.id)]
    return {"id": a.id, "text": a.text, "answers": a.answers, "files": a.files,
            "status": a.status.value, "messages": msgs, "notes": notes}


@router.post("/api/expert/appeals/{aid}/message")
def expert_message(aid: int, payload: dict, user: User = Depends(need(Role.expert)),
                   db: Session = Depends(get_db)):
    a = db.query(Appeal).filter_by(id=aid, assignee_id=user.id).first()
    if not a:
        raise HTTPException(404, "Не назначено тебе")
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(422, "Пустое сообщение")
    db.add(Message(appeal_id=a.id, author="expert", text=text))
    if payload.get("question"):
        a.status = Status.need_info
    elif a.status in (Status.assigned,):
        a.status = Status.in_work
    db.commit()
    return {"ok": True}


@router.post("/api/expert/appeals/{aid}/note")
def note(aid: int, payload: dict, user: User = Depends(need(Role.expert)),
         db: Session = Depends(get_db)):
    db.add(Note(appeal_id=aid, author_id=user.id, text=payload.get("text", "")))
    db.commit()
    return {"ok": True}


@router.post("/api/expert/appeals/{aid}/ready")
def ready(aid: int, payload: dict, user: User = Depends(need(Role.expert)),
          db: Session = Depends(get_db)):
    a = db.query(Appeal).filter_by(id=aid, assignee_id=user.id).first()
    db.add(Message(appeal_id=a.id, author="expert", text=payload.get("text", "")))
    a.status = Status.answer_ready
    db.commit()
    return {"ok": True}


@router.post("/api/expert/appeals/{aid}/transfer")
def transfer(aid: int, payload: dict, user: User = Depends(need(Role.expert)),
             db: Session = Depends(get_db)):
    a = db.query(Appeal).filter_by(id=aid, assignee_id=user.id).first()
    db.add(Audit(appeal_id=a.id, actor=user.login,
                 action="transfer_request: " + payload.get("reason", "")))
    db.commit()
    return {"ok": True, "note": "Оператор подтвердит и назначит нового ответственного"}
