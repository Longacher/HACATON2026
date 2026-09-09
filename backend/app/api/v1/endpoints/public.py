"""Публичный API для заявителя (без регистрации)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.models import (
    Appeal,
    AppealStatus,
    ApplicantType,
    Attachment,
    Category,
    Message,
)
from app.schemas.appeal import (
    AppealBrief,
    AppealCreate,
    AppealDetail,
    CategoryOut,
    MessageCreate,
    MessageOut,
)
from app.services.appeals import add_chat_message, log_status, utcnow
from app.services.attachments import clean_and_store
from app.services.chat_hub import chat_hub, message_payload
from app.services.crisis import detect_crisis
from app.services.classify import suggest_category_name
from app.services.ratelimit import check_track_attempts
from app.services.queues import publish_event
from app.utils.track import generate_track_number

router = APIRouter()
settings = get_settings()


@router.get("/stats")
def public_stats(db: Session = Depends(get_db)):
    """Публичные агрегаты для экрана доверия. Только цифры, без текстов."""
    total = db.execute(select(func.count(Appeal.id))).scalar() or 0
    helped = db.execute(
        select(func.count(Appeal.id)).where(Appeal.status == AppealStatus.completed)
    ).scalar() or 0
    return {"total": total, "helped": helped}


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    cats = db.execute(
        select(Category).where(Category.active.is_(True)).order_by(Category.order)
    ).scalars().all()
    return cats


@router.post("/appeals", response_model=AppealBrief)
def create_appeal(
    payload: AppealCreate,
    db: Session = Depends(get_db),
):
    if payload.is_category_path and not payload.category_id:
        raise HTTPException(400, "Выберите категорию")
    if not payload.is_category_path and not payload.free_text:
        raise HTTPException(400, "Опишите ситуацию своими словами")

    text = payload.free_text or ""
    is_crisis, markers = detect_crisis(text, payload.answers)

    # автоклассификация свободного текста: подсказка категории (оператор решает сам)
    suggested_category = None
    if not payload.is_category_path:
        suggested_cat_name = suggest_category_name(text, payload.answers)
        if suggested_cat_name:
            suggested_category = db.execute(
                select(Category).where(Category.name == suggested_cat_name)
            ).scalar_one_or_none()

    contact_value = (payload.contact_value or "").strip() or None
    appeal = Appeal(
        applicant_type=payload.applicant_type,
        is_category_path=payload.is_category_path,
        category_id=payload.category_id if payload.is_category_path else (suggested_category.id if suggested_category else None),
        free_text=text or None,
        answers=payload.answers or {},
        contact_name=(payload.contact_name or "").strip() or None,
        contact_value=contact_value,
        contact_consent=bool(payload.contact_consent and contact_value),
        status=AppealStatus.new,
        is_crisis=is_crisis,
        track_number=generate_track_number(),
        created_at=utcnow(),
        last_client_activity_at=utcnow(),
    )
    db.add(appeal)
    db.flush()

    log_status(db, appeal, AppealStatus.new, comment="Обращение создано заявителем")
    db.commit()
    db.refresh(appeal)
    publish_event("appeal.created", {
        "appeal_id": str(appeal.id),
        "track_number": appeal.track_number,
        "applicant_type": appeal.applicant_type.value,
        "category": str(appeal.category_id) if appeal.category_id else None,
        "status": appeal.status.value,
        "is_crisis": appeal.is_crisis,
        "priority": appeal.priority.value,
        "free_text": appeal.free_text,
        "answers": appeal.answers,
    })
    return appeal


@router.post("/appeals/{track}/attachments")
def upload_attachments(
    track: str,
    files: Annotated[list[UploadFile], File()] = None,
    db: Session = Depends(get_db),
):
    """Вложения заявителя: до 5 файлов, суммарно до 10 МБ, EXIF вырезается (ТЗ 4.1)."""
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Не найдено")
    if not files:
        raise HTTPException(400, "Файлы не переданы")
    if len(files) > settings.MAX_ATTACHMENTS:
        raise HTTPException(400, f"Можно приложить не более {settings.MAX_ATTACHMENTS} файлов")

    current_size = sum(att.size_bytes for att in appeal.attachments)
    stored = []
    for f in files:
        meta = clean_and_store(f)
        if current_size + meta["size_bytes"] > settings.MAX_ATTACHMENT_MB * 1024 * 1024:
            raise HTTPException(400, "Превышен суммарный лимит вложений (10 МБ)")
        att = Attachment(appeal_id=appeal.id, **meta)
        db.add(att)
        stored.append(att)
        current_size += meta["size_bytes"]
    db.commit()
    return {"ok": True, "count": len(stored)}
@router.get("/appeals/{track}", response_model=AppealDetail)
def get_appeal(track: str, request: Request, db: Session = Depends(get_db)):
    # анонимность: используем только IP как rate-limit ключ, НЕ сохраняем
    client_key = request.client.host if request.client else "unknown"
    if not check_track_attempts(client_key):
        raise HTTPException(429, "Слишком много попыток. Подождите минуту.")
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Обращение не найдено")
    return appeal


@router.get("/appeals/{track}/messages", response_model=list[MessageOut])
def list_client_messages(track: str, db: Session = Depends(get_db)):
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Не найдено")
    msgs = db.execute(
        select(Message).where(Message.appeal_id == appeal.id).order_by(Message.created_at)
    ).scalars().all()
    return msgs


@router.post("/appeals/{track}/messages", response_model=MessageOut)
async def send_client_message(track: str, payload: MessageCreate, db: Session = Depends(get_db)):
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Не найдено")
    if appeal.status in (AppealStatus.completed, AppealStatus.rejected, AppealStatus.closed_no_answer):
        raise HTTPException(400, "Обращение закрыто")
    msg = add_chat_message(db, appeal, "applicant", None, payload.text)
    db.commit()
    db.refresh(msg)
    await chat_hub.broadcast(str(appeal.id), message_payload(msg))
    return msg


@router.post("/appeals/{track}/resolve", response_model=AppealBrief)
def client_resolve(track: str, payload: MessageCreate | None = None, db: Session = Depends(get_db)):
    """Заявитель подтверждает закрытие: «Это помогло»."""
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Не найдено")
    if appeal.status != AppealStatus.answer_ready:
        raise HTTPException(400, "Обращение не готово к закрытию")
    log_status(db, appeal, AppealStatus.completed, comment="Заявитель подтвердил закрытие")
    appeal.closed_at = utcnow()
    db.commit()
    db.refresh(appeal)
    return appeal


@router.post("/appeals/{track}/return", response_model=AppealBrief)
def client_return(track: str, payload: MessageCreate, db: Session = Depends(get_db)):
    """Заявитель нажал «Это не помогло» -> Возвращено (идёт оператору)."""
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Не найдено")
    if appeal.status != AppealStatus.answer_ready:
        raise HTTPException(400, "Обращение не в статусе «Ответ готов»")
    if (appeal.return_count or 0) >= settings.MAX_RETURNS:
        raise HTTPException(400, "Лимит возвратов исчерпан — напишите новое обращение, если нужна помощь")
    appeal.return_count = (appeal.return_count or 0) + 1
    appeal.return_reason = payload.text
    log_status(db, appeal, AppealStatus.returned, comment=payload.text)
    db.commit()
    db.refresh(appeal)
    return appeal


@router.post("/appeals/{track}/feedback")
def client_feedback(track: str, payload: dict, db: Session = Depends(get_db)):
    appeal = db.execute(
        select(Appeal).where(Appeal.track_number == track)
    ).scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Не найдено")
    appeal.feedback_score = payload.get("score")
    appeal.feedback_comment = payload.get("comment")
    appeal.complain_about_expert = payload.get("complain", False)
    appeal.complain_text = payload.get("complain_text")
    db.commit()
    return {"ok": True}
