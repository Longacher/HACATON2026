"""Аутентификация: вход оператора/эксперта/админа."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import User
from app.schemas.api import LoginRequest, TokenOut
from app.core.security import verify_password
from app.services.auth import create_access_token

logger = logging.getLogger("app.auth")

router = APIRouter()


@router.post("/auth/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(User.username == payload.username)
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning("login failed username=%r", payload.username)
        raise HTTPException(401, "Неверные имя пользователя или пароль")
    if not user.active:
        raise HTTPException(403, "Учётная запись отключена")
    return TokenOut(
        access_token=create_access_token(user),
        role=user.role.value,
        display_name=user.display_name or user.username,
    )
