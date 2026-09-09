"""Демо-данные: категории, правила, персонал (логины для README)."""
from .auth import hash_pwd
from .db import Session, settings
from .models import Category, Role, RoutingRule, User

CATEGORIES = [
    ("Травля и оскорбления", "psych"),
    ("Конфликт с одноклассниками", "conflict"),
    ("Кибербуллинг", "psych"),
    ("Давление и угрозы", "law"),
    ("Конфликт с учителем", "conflict"),
    ("Конфликт с родителями", "social"),
    ("Вопрос юридического характера", "law"),
    ("Не знаю, как это назвать", "general"),
]

STAFF = [
    ("operator1", "oper123", Role.operator, ""),
    ("expert_psy", "exp123", Role.expert, "psych"),
    ("expert_law", "exp123", Role.expert, "law"),
    ("admin", "admin123", Role.admin, ""),
]


def seed_demo():
    if not settings.seed_demo:
        return
    db = Session()
    try:
        if db.query(User).first():
            return
        cats = {}
        for name, group in CATEGORIES:
            c = Category(name=name, group=group)
            db.add(c)
            db.flush()
            cats[name] = c
        for c in cats.values():
            db.add(RoutingRule(category_id=c.id, group=c.group, max_load=10))
        for login, raw, role, profile in STAFF:
            db.add(User(login=login, pwd_hash=hash_pwd(raw), role=role, profile=profile))
        db.commit()
    finally:
        db.close()
