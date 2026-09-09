"""Машина состояний обращения и вспомогательные сервисы."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    AdminLog,
    Appeal,
    AppealStatus,
    AppealStatusLog,
    Message,
    User,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def log_status(
    db: Session,
    appeal: Appeal,
    to_status: AppealStatus,
    actor: User | None = None,
    comment: str | None = None,
) -> None:
    db.add(
        AppealStatusLog(
            appeal_id=appeal.id,
            from_status=appeal.status.value if appeal.status else None,
            to_status=to_status.value,
            actor_user_id=actor.id if actor else None,
            comment=comment,
            created_at=utcnow(),
        )
    )
    appeal.status = to_status


def log_admin(db: Session, admin: User, appeal: Appeal | None, action: str, reason: str, detail: dict = None) -> None:
    db.add(
        AdminLog(
            admin_id=admin.id,
            appeal_id=appeal.id if appeal else None,
            action=action,
            reason=reason,
            detail=detail or {},
            created_at=utcnow(),
        )
    )


def add_chat_message(
    db: Session,
    appeal: Appeal,
    author_type: str,
    author: User | None,
    text: str,
) -> Message:
    msg = Message(
        appeal_id=appeal.id,
        author_type=author_type,
        author_user_id=author.id if author else None,
        text=text,
        created_at=utcnow(),
    )
    db.add(msg)
    appeal.last_client_activity_at = utcnow()
    return msg


# Заявитель видит "от лица сервиса": специалистов без имён (4.4 Единый голос)
def specialist_display_label(appeal: Appeal, user: User | None = None) -> str:
    if appeal.category_id:
        return "Специалист"
    return "Специалист"


def publish_status_event(db: Session, appeal: Appeal, actor: User | None = None):
    """Публикует событие смены статуса в шину (RabbitMQ)."""
    from app.services.queues import publish_event
    try:
        publish_event("appeal.status_changed", {
            "appeal_id": str(appeal.id),
            "status": appeal.status.value,
            "priority": appeal.priority.value,
            "actor": actor.role.value if actor else None,
        })
    except Exception:
        pass
