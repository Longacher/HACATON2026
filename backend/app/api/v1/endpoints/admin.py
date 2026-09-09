"""Рабочее место администратора (ТЗ 2.4, 4.5, 4.6)."""

import csv
import uuid
from datetime import datetime, timedelta, timezone
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    AdminLog,
    Appeal,
    AppealStatus,
    Category,
    RoutingRule,
    SpecialistGroup,
    Transfer,
    User,
    UserGroup,
)
from app.schemas.api import (
    AdminAppealAction,
    CategoryCreate,
    GroupCreate,
    RoutingRuleCreate,
    UserCreate,
)
from app.services.analytics import AnalyticsService
from app.services.routing import best_candidate, category_hint
from app.services.appeals import log_admin, log_status, utcnow
from app.services.auth import require_role
from app.core.security import hash_password

router = APIRouter(prefix="/admin", dependencies=[Depends(require_role("admin"))])


# ---- Категории ----
@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    return db.execute(select(Category).order_by(Category.order)).scalars().all()


@router.post("/categories")
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    c = Category(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


# ---- Группы специалистов ----
@router.get("/groups")
def groups(db: Session = Depends(get_db)):
    return db.execute(select(SpecialistGroup)).scalars().all()


@router.post("/groups")
def create_group(payload: GroupCreate, db: Session = Depends(get_db)):
    g = SpecialistGroup(**payload.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


# ---- Правила маршрутизации ----
@router.post("/routing-rules")
def create_rule(payload: RoutingRuleCreate, db: Session = Depends(get_db)):
    db.add(RoutingRule(category_id=payload.category_id, group_id=payload.group_id))
    db.commit()
    return {"ok": True}


# ---- Учётные записи ----
@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    u = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        display_name=payload.display_name,
        max_active_appeals=payload.max_active_appeals,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": str(u.id)}


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    rows = db.execute(select(User)).scalars().all()
    return [
        {"id": str(u.id), "username": u.username, "role": u.role.value, "display_name": u.display_name, "active": u.active}
        for u in rows
    ]


# ---- Изменение любого обращения ----
@router.post("/appeals/{appeal_id}/action")
def admin_action(appeal_id: uuid.UUID, payload: AdminAppealAction, db: Session = Depends(get_db), admin: User = Depends(require_role("admin"))):
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    admin_user_id = None
    if not payload.reason:
        raise HTTPException(400, "Укажите причину (записывается в журнал)")
    if payload.status:
        log_status(db, a, payload.status, actor=admin, comment=payload.reason)
    if payload.priority:
        a.priority = payload.priority
    if payload.expert_id:
        a.responsible_expert_id = payload.expert_id
    log_admin(db, admin, a, "admin_action", payload.reason,
              detail={"status": payload.status.value if payload.status else None,
                      "priority": payload.priority.value if payload.priority else None,
                      "expert_id": payload.expert_id})
    db.commit()
    from app.services.appeals import publish_status_event
    publish_status_event(db, a, admin)
    return {"ok": True}


@router.get("/transfers")
def pending_transfers(db: Session = Depends(get_db)):
    """Нерешённые запросы передачи: кто просит, по какому обращению, почему."""
    rows = db.execute(
        select(Transfer, Appeal, User)
        .join(Appeal, Transfer.appeal_id == Appeal.id)
        .join(User, Transfer.requested_by == User.id, isouter=True)
        .where(Transfer.resolved.is_(False))
        .order_by(Transfer.created_at.asc())
    ).all()
    return [
        {
            "appeal_id": str(a.id),
            "track_number": a.track_number,
            "status": a.status.value,
            "reason": t.reason,
            "requested_by": u.display_name if u else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t, a, u in rows
    ]


@router.post("/appeals/{appeal_id}/transfer-resolve")
def resolve_transfer(appeal_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), admin: User = Depends(require_role("admin"))):
    """Подтверждение передачи оператором — здесь админ демонстрирует, либо оператор вызывает через свой endpoint."""
    a = db.get(Appeal, appeal_id)
    if not a:
        raise HTTPException(404, "Не найдено")
    t = db.execute(
        select(Transfer).where(Transfer.appeal_id == a.id, Transfer.resolved.is_(False))
    ).scalars().first()
    if t:
        t.resolved = True
        t.resolved_by = admin.id
        t.resolved_at = utcnow()
        if payload.get("new_expert_id"):
            a.responsible_expert_id = payload["new_expert_id"]
            log_status(db, a, AppealStatus.assigned, actor=admin, comment=f"Передача подтверждена: {t.reason}")
    db.commit()
    return {"ok": True}


# ---- Аналитика ----
@router.get("/attention")
def attention(db: Session = Depends(get_db)):
    """ТЗ 4.5: обращения, которым некого назначить (нет правила / нет людей / все перегружены)."""
    from app.services.routing import best_candidate
    rows = db.execute(
        select(Appeal).where(Appeal.status.in_([AppealStatus.new, AppealStatus.returned]))
    ).scalars().all()
    out = []
    for a in rows:
        if best_candidate(db, a) is None:
            hint = category_hint(db, a) or {}
            groups = hint.get("groups") or []
            reason = "нет правила маршрутизации" if not groups else "все специалисты перегружены"
            if hint.get("no_experts"):
                reason = "в группах нет специалистов"
            out.append({
                "appeal_id": str(a.id),
                "track_number": a.track_number,
                "status": a.status.value,
                "is_crisis": a.is_crisis,
                "reason": reason,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })
    return {"items": out, "count": len(out)}


@router.get("/logs")
def admin_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Журнал действий администраторов (С7 п.5): кто, что, почему."""
    limit = max(1, min(limit, 200))
    rows = db.execute(
        select(AdminLog, User, Appeal)
        .join(User, AdminLog.admin_id == User.id, isouter=True)
        .join(Appeal, AdminLog.appeal_id == Appeal.id, isouter=True)
        .order_by(AdminLog.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "action": l.action,
            "reason": l.reason,
            "detail": l.detail,
            "admin": u.display_name if u else None,
            "track_number": a.track_number if a else None,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l, u, a in rows
    ]


@router.get("/analytics")
def analytics(period_days: int = 30, db: Session = Depends(get_db)):
    return AnalyticsService.dashboard(db, period_days)


@router.get("/report.csv")
def report_csv(period_days: int = 30, db: Session = Depends(get_db)):
    """Обезличенная выгрузка, без текстов и контактов."""
    content = AnalyticsService.report_csv(db, period_days)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=report.csv"},
    )


@router.get("/report.xlsx")
def report_xlsx(period_days: int = 30, db: Session = Depends(get_db)):
    """Та же обезличенная выгрузка в XLSX (ТЗ 4.6: CSV или XLSX)."""
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from io import BytesIO
    rows = AnalyticsService.report_rows(db, period_days)
    wb = Workbook()
    ws = wb.active
    ws.title = "Отчёт"
    header = ["id", "created_at", "applicant_type", "category_id", "priority",
              "status", "is_crisis", "return_count", "closed_at"]
    ws.append(header)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append(r)
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = 22
    buf = BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=report.xlsx"},
    )
