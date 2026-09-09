"""Сид: тестовые учётные записи, категории, группы, правила маршрутизации."""

import uuid

from app.db.session import Base, SessionLocal, engine
from app.models.models import (
    Category,
    RoutingRule,
    SpecialistGroup,
    User,
    UserGroup,
)
from app.core.security import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Учётные записи
        if db.query(User).count() == 0:
            users = [
                User(username="admin", password_hash=hash_password("admin123"),
                     role="admin", display_name="Администратор"),
                User(username="op", password_hash=hash_password("op123"),
                     role="operator", display_name="Оператор"),
                User(username="psy1", password_hash=hash_password("psy123"),
                     role="expert", display_name="Психолог", max_active_appeals=5),
                User(username="psy2", password_hash=hash_password("psy123"),
                     role="expert", display_name="Психолог 2", max_active_appeals=5),
                User(username="jur", password_hash=hash_password("jur123"),
                     role="expert", display_name="Юрист", max_active_appeals=3),
                User(username="soc", password_hash=hash_password("soc123"),
                     role="expert", display_name="Социальный педагог", max_active_appeals=3),
            ]
            db.add_all(users)
            db.flush()

            # Категории (стартовый набор из ТЗ 4.1)
            cat_names = [
                "Травля и оскорбления",
                "Конфликт с одноклассниками",
                "Кибербуллинг",
                "Давление и угрозы",
                "Конфликт с учителем",
                "Конфликт с родителями",
                "Вопрос юридического характера",
                "Не знаю, как назвать",
            ]
            cats = []
            for i, name in enumerate(cat_names):
                c = Category(name=name, is_free_fallback=(name == "Не знаю, как назвать"), order=i)
                db.add(c)
                cats.append(c)
            db.flush()

            # Группы
            psy = SpecialistGroup(name="psychologists", display_label="Психологи")
            jur = SpecialistGroup(name="lawyers", display_label="Юристы")
            soc = SpecialistGroup(name="social", display_label="Социальные педагоги")
            db.add_all([psy, jur, soc])
            db.flush()

            # Привязка экспертов к группам
            db.add_all([
                UserGroup(user_id=users[2].id, group_id=psy.id),
                UserGroup(user_id=users[3].id, group_id=psy.id),
                UserGroup(user_id=users[4].id, group_id=jur.id),
                UserGroup(user_id=users[5].id, group_id=soc.id),
            ])

            # Правила маршрутизации: категория -> группа
            mapping = {
                0: psy, 1: psy, 2: psy, 3: (psy,),  # угрозы — психологи (+юрист как соисп.)
                4: soc, 5: psy, 6: jur, 7: psy,     # "не знаю как назвать" -> психологи
            }
            for idx, groups in mapping.items():
                for g in (groups if isinstance(groups, tuple) else [groups]):
                    db.add(RoutingRule(category_id=cats[idx].id, group_id=g.id))

            db.commit()
            print("Сид выполнен: пользователи, категории, группы, правила.")
        else:
            print("База уже содержит данные, сид пропущен.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
