"""«Отклик» — платформа доверительных обращений. FastAPI приложение."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import get_settings
from app.api.v1.router import api_router
from app.db.session import Base, engine, SessionLocal
from app.models.models import Appeal, AppealStatus
from app.services.appeals import log_status, utcnow
from datetime import timedelta


def _auto_close_stale():
    """ТЗ 5.1: «Закрыто без ответа» — заявитель не вернулся N дней."""
    db = SessionLocal()
    try:
        threshold = utcnow() - timedelta(days=get_settings().AUTO_CLOSE_DAYS)
        stale = (
            db.query(Appeal)
            .filter(
                Appeal.status.in_([AppealStatus.answer_ready, AppealStatus.need_clarification, AppealStatus.in_progress, AppealStatus.assigned]),
                (Appeal.last_client_activity_at.is_(None) | (Appeal.last_client_activity_at < threshold)),
            )
            .all()
        )
        for a in stale:
            log_status(db, a, AppealStatus.closed_no_answer, comment="Заявитель не вернулся, обращение закрыто автоматически")
            a.closed_at = utcnow()
        db.commit()
    finally:
        db.close()


_scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _scheduler.add_job(_auto_close_stale, "interval", hours=6)
    _scheduler.start()
    yield
    _scheduler.shutdown()


settings = get_settings()

app = FastAPI(title="Отклик", version="0.1.0", lifespan=lifespan)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Статические вложения (не обязательное)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.UPLOAD_DIR), name="files")


@app.get("/health")
def health():
    return {"status": "ok"}
