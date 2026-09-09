import datetime as dt
import enum

from sqlalchemy import (
    JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Role(str, enum.Enum):
    operator = "operator"
    expert = "expert"
    admin = "admin"


class ApplicantType(str, enum.Enum):
    school = "school"   # школьник — «ты»
    parent = "parent"   # родитель — «вы»
    teacher = "teacher"  # педагог — «вы»


class Status(str, enum.Enum):
    new = "new"                  # Новое
    assigned = "assigned"        # Распределено
    in_work = "in_work"          # В работе
    need_info = "need_info"      # Нужно уточнение
    answer_ready = "answer_ready"  # Ответ готов
    returned = "returned"        # Возвращено
    done = "done"                # Завершено
    rejected = "rejected"        # Отклонено
    closed_silent = "closed_silent"  # Закрыто без ответа


class Priority(str, enum.Enum):
    urgent = "urgent"
    standard = "standard"
    low = "low"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True)
    pwd_hash: Mapped[str] = mapped_column(String(128))
    role: Mapped[Role] = mapped_column(Enum(Role))
    profile: Mapped[str] = mapped_column(String(64), default="")  # психолог/юрист/...
    active_load: Mapped[int] = mapped_column(Integer, default=0)


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    group: Mapped[str] = mapped_column(String(64), default="general")


class RoutingRule(Base):
    __tablename__ = "routing_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    group: Mapped[str] = mapped_column(String(64), default="")
    max_load: Mapped[int] = mapped_column(Integer, default=10)


class Appeal(Base):
    __tablename__ = "appeals"
    id: Mapped[int] = mapped_column(primary_key=True)
    track_hash: Mapped[str] = mapped_column(String(64), unique=True)  # SHA-256 номера
    applicant: Mapped[ApplicantType] = mapped_column(Enum(ApplicantType))
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)  # уточняющие вопросы
    files: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.new)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.standard)
    crisis: Mapped[bool] = mapped_column(Boolean, default=False)
    contact: Mapped[str | None] = mapped_column(String(256), nullable=True)  # отдельно!
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    returns: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    assignee: Mapped[User | None] = relationship()


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    appeal_id: Mapped[int] = mapped_column(ForeignKey("appeals.id"))
    author: Mapped[str] = mapped_column(String(16))  # applicant | expert
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Note(Base):
    __tablename__ = "notes"  # внутренние, заявителю не видны
    id: Mapped[int] = mapped_column(primary_key=True)
    appeal_id: Mapped[int] = mapped_column(ForeignKey("appeals.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Audit(Base):
    __tablename__ = "audit"  # действия админа/передачи
    id: Mapped[int] = mapped_column(primary_key=True)
    appeal_id: Mapped[int | None] = mapped_column(ForeignKey("appeals.id"), nullable=True)
    actor: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
