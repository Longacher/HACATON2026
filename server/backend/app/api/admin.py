"""Админ: категории, правила, пользователи. Переписку не видит, обращения не закрывает."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import hash_pwd, need
from ..db import get_db
from ..models import Appeal, Audit, Category, Priority, Role, RoutingRule, Status, User

router = APIRouter()
ADMIN = need(Role.admin)


@router.get("/api/admin/categories")
def cats(user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "group": c.group} for c in db.query(Category).all()]


@router.post("/api/admin/categories")
def add_cat(payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    c = Category(name=payload["name"], group=payload.get("group", "general"))
    db.add(c)
    db.commit()
    return {"id": c.id}


@router.post("/api/admin/rules")
def add_rule(payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    r = RoutingRule(category_id=payload["category_id"], group=payload["group"],
                    max_load=payload.get("max_load", 10))
    db.add(r)
    db.commit()
    return {"id": r.id}


@router.post("/api/admin/users")
def add_user(payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    if db.query(User).filter_by(login=payload["login"]).first():
        raise HTTPException(409, "Логин занят")
    u = User(login=payload["login"], pwd_hash=hash_pwd(payload["password"]),
             role=Role(payload["role"]), profile=payload.get("profile", ""))
    db.add(u)
    db.commit()
    return {"id": u.id}


@router.post("/api/admin/appeals/{aid}/unblock")
def unblock(aid: int, payload: dict, user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    """Разблокировка зависших: статус/приоритет/исполнитель + запись в журнал."""
    a = db.query(Appeal).get(aid)
    if not a:
        raise HTTPException(404, "Нет такого")
    if not payload.get("reason"):
        raise HTTPException(422, "Укажи причину")
    if payload.get("status"):
        a.status = Status(payload["status"])
    if payload.get("priority"):
        a.priority = Priority(payload["priority"])
    if payload.get("expert_id"):
        a.assignee_id = payload["expert_id"]
    db.add(Audit(appeal_id=a.id, actor=user.login, action="unblock: " + payload["reason"]))
    db.commit()
    return {"ok": True}


@router.get("/api/admin/audit")
def audit(user: User = Depends(ADMIN), db: Session = Depends(get_db)):
    return [{"appeal": x.appeal_id, "actor": x.actor, "action": x.action,
             "at": x.created_at.isoformat()}
            for x in db.query(Audit).order_by(Audit.id.desc()).limit(100)]
