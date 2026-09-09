"""Публичные ручки заявителя: подача, статус по трек-номеру, чат-чтение, оценка."""
import os

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from PIL import Image
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..db import get_db, settings
from ..models import Appeal, ApplicantType, Category, Message, Status
from ..track import detect_crisis, new_track_number, track_hash

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

EMERGENCY = "Если тебе тяжело прямо сейчас — позвони 8-800-2000-122 (детский телефон доверия, бесплатно)."

STATUS_TEXT = {
    "new": "Мы получили твоё обращение",
    "assigned": "Мы передали обращение специалисту",
    "in_work": "Специалист разбирается в ситуации",
    "need_info": "Специалист задал вопрос — посмотри, пожалуйста",
    "answer_ready": "Мы подготовили рекомендации",
    "returned": "Мы вернулись к твоей ситуации",
    "done": "Рады, что смогли помочь",
    "rejected": "Помочь с этим не сможем, вот куда обратиться",
    "closed_silent": "Обращение закрыто, но можно написать снова",
}


def _appeal_or_403(db: Session, number: str) -> Appeal:
    a = db.query(Appeal).filter_by(track_hash=track_hash(number)).first()
    if not a:
        raise HTTPException(404, "Обращение не найдено")
    return a


@router.get("/api/categories")
def categories(db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name} for c in db.query(Category).all()]


@router.post("/api/appeals")
def create_appeal(payload: dict, db: Session = Depends(get_db)):
    text = (payload.get("text") or "").strip()
    cat = db.query(Category).get(payload.get("category_id")) if payload.get("category_id") else None
    need_text = cat is None or cat.name == "Не знаю, как это назвать"
    if need_text and len(text) < 10:
        raise HTTPException(422, "Можешь добавить пару деталей? Так будет проще помочь")
    answers = payload.get("answers") or {}
    crisis = detect_crisis(text, answers)
    number = new_track_number()
    while db.query(Appeal).filter_by(track_hash=track_hash(number)).first():
        number = new_track_number()
    a = Appeal(
        track_hash=track_hash(number),
        applicant=ApplicantType(payload.get("applicant", "school")),
        category_id=payload.get("category_id"),
        text=text,
        answers=answers,
        crisis=crisis,
        contact=payload.get("contact") if crisis else None,
    )
    db.add(a)
    db.commit()
    out = {"track": number, "crisis": crisis}
    if crisis:
        out["help"] = EMERGENCY
    return out


@router.get("/api/appeals/{number}")
@limiter.limit("5/minute")
def appeal_status(request: Request, number: str, db: Session = Depends(get_db)):
    a = _appeal_or_403(db, number)
    msgs = [
        {"author": m.author, "text": m.text, "at": m.created_at.isoformat()}
        for m in db.query(Message).filter_by(appeal_id=a.id).order_by(Message.id).all()
    ]
    return {
        "status": a.status.value,
        "human": STATUS_TEXT[a.status.value],
        "messages": msgs,
        "answers": a.answers,
        "files": a.files,
        "rating": a.rating,
        "returns_left": max(0, 2 - a.returns),
    }


@router.post("/api/appeals/{number}/messages")
def applicant_message(number: str, payload: dict, db: Session = Depends(get_db)):
    a = _appeal_or_403(db, number)
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(422, "Пустое сообщение")
    db.add(Message(appeal_id=a.id, author="applicant", text=text))
    if a.status == Status.need_info:
        a.status = Status.in_work
    db.commit()
    return {"ok": True}


@router.post("/api/appeals/{number}/resolve")
def resolve(number: str, payload: dict, db: Session = Depends(get_db)):
    """Кнопки «Это помогло» / «Это не помогло»."""
    a = _appeal_or_403(db, number)
    if a.status != Status.answer_ready:
        raise HTTPException(409, "Пока нечего оценивать")
    if payload.get("helped"):
        a.status = Status.done
        a.rating = payload.get("rating")
    else:
        if a.returns >= 2:
            raise HTTPException(409, "Лимит возвратов исчерпан")
        a.status = Status.returned
        a.returns += 1
        db.add(Message(appeal_id=a.id, author="applicant",
                       text="Не помогло: " + (payload.get("reason") or "")))
    db.commit()
    return {"status": a.status.value}


@router.post("/api/appeals/{number}/files")
def upload(number: str, files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    a = _appeal_or_403(db, number)
    if len(a.files) + len(files) > 5:
        raise HTTPException(422, "Можно не больше 5 файлов")
    os.makedirs(settings.upload_dir, exist_ok=True)
    saved = list(a.files)
    for f in files:
        data = f.file.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(422, f"Файл {f.filename} больше 10 МБ")
        name = f"{a.id}_{len(saved)}_{os.path.basename(f.filename or 'file')}"
        path = os.path.join(settings.upload_dir, name)
        with open(path, "wb") as out:
            out.write(data)
        try:  # чистим EXIF/геометки
            img = Image.open(path)
            img.save(path, exif=b"") if "exif" in img.info else img.save(path)
        except Exception:
            pass
        saved.append(name)
    a.files = saved
    db.commit()
    return {"files": len(saved)}
