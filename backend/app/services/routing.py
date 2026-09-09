"""Маршрутизация обращений (ТЗ 4.5).

Правила задаёт администратор, решение принимает оператор.
Система даёт ПОДСКАЗКУ: категория -> группа специалистов -> свободный специалист.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.models import (
    Appeal,
    AppealStatus,
    Category,
    CoExecutor,
    RoutingRule,
    SpecialistGroup,
    User,
    UserGroup,
)


def category_hint(db: Session, appeal: Appeal) -> dict | None:
    """Возвращает подсказку по правилу маршрутизации для категории обращения."""
    if not appeal.category_id:
        return None
    rules = (
        db.execute(
            select(RoutingRule).where(RoutingRule.category_id == appeal.category_id)
        )
        .scalars()
        .all()
    )
    if not rules:
        # категория не привязана к группе — нет подсказки
        return {"groups": [], "candidates": [], "note": "Для категории не настроено правило маршрутизации"}
    suggestions = []
    for rule in rules:
        group = db.get(SpecialistGroup, rule.group_id)
        if not group:
            continue
        experts = _experts_in_group(db, group.id)
        suggestions.append(
            {
                "group": {"id": str(group.id), "name": group.name, "label": group.display_label or group.name},
                "experts": experts,
            }
        )
    all_experts = [e for g in suggestions for e in g["experts"]]
    free = [e for e in all_experts if e["load"] < e["max_active"]]
    return {
        "groups": suggestions,
        # ТЗ 4.5: некого назначить / все перегружены — видно оператору и админу
        "no_experts": len(all_experts) == 0,
        "all_busy": len(all_experts) > 0 and not free,
    }


def _experts_in_group(db: Session, group_id) -> list[dict]:
    rows = (
        db.execute(
            select(User)
            .join(UserGroup, UserGroup.user_id == User.id)
            .where(UserGroup.group_id == group_id, User.role == "expert", User.active.is_(True))
        )
        .scalars()
        .all()
    )
    result = []
    for u in rows:
        result.append(
            {
                "id": str(u.id),
                "display_name": u.display_name,
                "load": _current_load(db, u.id),
                "max_active": u.max_active_appeals,
            }
        )
    return result


def _current_load(db: Session, user_id) -> int:
    """Число активных (не завершённых) обращений у специалиста."""
    active = [
        AppealStatus.new,
        AppealStatus.assigned,
        AppealStatus.in_progress,
        AppealStatus.need_clarification,
        AppealStatus.answer_ready,
        AppealStatus.returned,
    ]
    n = db.scalar(
        select(func.count(Appeal.id)).where(
            Appeal.responsible_expert_id == user_id, Appeal.status.in_(active)
        )
    )
    return n or 0


def best_candidate(db: Session, appeal: Appeal) -> dict | None:
    """Свободный специалист в группе, если есть и не перегружен."""
    hint = category_hint(db, appeal)
    if not hint or not hint.get("groups"):
        return None
    for g in hint["groups"]:
        for expert in g["experts"]:
            if expert["load"] < expert["max_active"]:
                return expert
    return None


def available_experts(db: Session, appeal: Appeal) -> list[User]:
    """Все эксперты группы, назначенные по правилу категории.""" 
    hint = category_hint(db, appeal)
    if not hint or not hint.get("groups"):
        return []
    ids = []
    for g in hint["groups"]:
        for expert in g["experts"]:
            ids.append(expert["id"])
    if not ids:
        return []
    return db.execute(select(User).where(User.id.in_(ids))).scalars().all()
