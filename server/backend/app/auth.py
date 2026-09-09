"""JWT для персонала + зависимость ролей. Заявитель — трек-токеном, не JWT."""
import datetime as dt

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .db import get_db, settings
from .models import Role, User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def hash_pwd(raw: str) -> str:
    return pwd.hash(raw)


def make_token(user: User) -> str:
    exp = dt.datetime.utcnow() + dt.timedelta(minutes=settings.jwt_minutes)
    return jwt.encode(
        {"sub": user.login, "role": user.role.value, "exp": exp},
        settings.jwt_secret, algorithm="HS256",
    )


def current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not cred:
        raise HTTPException(401, "Нужна авторизация")
    try:
        data = jwt.decode(cred.credentials, settings.jwt_secret, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Токен неверный")
    user = db.query(User).filter_by(login=data["sub"]).first()
    if not user:
        raise HTTPException(401, "Пользователь не найден")
    return user


def need(*roles: Role):
    def _dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Нет прав")
        return user
    return _dep
