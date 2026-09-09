"""Отклик — бэкенд платформы доверительных обращений."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

from .db import Base, engine
from . import models  # noqa: F401  (регистрация моделей)
from .seed import seed_demo
from .api import public, staff, admin, analytics, chat

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Отклик API")
app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
seed_demo()

app.include_router(public.router)
app.include_router(chat.router)
app.include_router(staff.router)
app.include_router(admin.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    return {"ok": True}
