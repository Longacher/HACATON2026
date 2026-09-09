import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

# JSONB в PostgreSQL, с фолбэком на обычный JSON (SQLite для тестов).
JSONBCompat = JSONB().with_variant(JSON, "sqlite")

from app.db.session import Base

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # без 0/O/1/I/l


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    operator = "operator"
    expert = "expert"
    admin = "admin"


class ApplicantType(str, enum.Enum):
    student = "student"  # школьник — на "ты"
    parent = "parent"    # родитель — на "вы"
    teacher = "teacher"  # педагог — на "вы"


class Priority(str, enum.Enum):
    low = "low"
    standard = "standard"
    urgent = "urgent"


class AppealStatus(str, enum.Enum):
    new = "new"
    assigned = "assigned"
    in_progress = "in_progress"
    need_clarification = "need_clarification"
    answer_ready = "answer_ready"
    returned = "returned"
    completed = "completed"
    rejected = "rejected"
    closed_no_answer = "closed_no_answer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(300))
    role: Mapped[Role] = mapped_column(Enum(Role), index=True)
    display_name: Mapped[str] = mapped_column(String(200), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_active_appeals: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    is_free_fallback: Mapped[bool] = mapped_column(Boolean, default=False)  # "не знаю, как назвать"
    order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class SpecialistGroup(Base):
    __tablename__ = "specialist_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    display_label: Mapped[str] = mapped_column(String(200), default="")  # "Психологи", "Юристы"...


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), index=True)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("specialist_groups.id"), index=True)


class UserGroup(Base):
    __tablename__ = "user_groups"
    __table_args__ = (UniqueConstraint("user_id", "group_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("specialist_groups.id"), index=True)


class Appeal(Base):
    __tablename__ = "appeals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    track_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    applicant_type: Mapped[ApplicantType] = mapped_column(Enum(ApplicantType), index=True)
    is_category_path: Mapped[bool] = mapped_column(Boolean, default=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    free_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    answers: Mapped[dict] = mapped_column(JSONBCompat, default=dict)
    status: Mapped[AppealStatus] = mapped_column(Enum(AppealStatus), default=AppealStatus.new, index=True)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.standard, index=True)

    is_crisis: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # назначение
    operator_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    responsible_expert_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # ветка «не помогло»
    return_count: Mapped[int] = mapped_column(Integer, default=0)
    return_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # связь (кризис, по согласию) — хранится отдельно от текста
    contact_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    contact_seen_by_operator: Mapped[bool] = mapped_column(Boolean, default=False)

    # таймстемпы жизненного цикла
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    operator_taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_expert_reply_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_client_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    feedback_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    complain_about_expert: Mapped[bool] = mapped_column(Boolean, default=False)
    complain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    complain_seen_by_operator: Mapped[bool] = mapped_column(Boolean, default=False)

    # роли
    messages: Mapped[list["Message"]] = relationship(
        back_populates="appeal", cascade="all, delete-orphan"
    )
    notes: Mapped[list["InternalNote"]] = relationship(
        back_populates="appeal", cascade="all, delete-orphan"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="appeal", cascade="all, delete-orphan"
    )
    statuses: Mapped[list["AppealStatusLog"]] = relationship(
        back_populates="appeal", cascade="all, delete-orphan", order_by="AppealStatusLog.id"
    )
    transfers: Mapped[list["Transfer"]] = relationship(
        back_populates="appeal", cascade="all, delete-orphan"
    )
    co_executors: Mapped[list["CoExecutor"]] = relationship(
        back_populates="appeal", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appeal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appeals.id"), index=True)
    author_type: Mapped[str] = mapped_column(String(20))  # applicant | specialist
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    appeal: Mapped[Appeal] = relationship(back_populates="messages")


class InternalNote(Base):
    __tablename__ = "internal_notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appeal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appeals.id"), index=True)
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appeal: Mapped[Appeal] = relationship(back_populates="notes")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appeal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appeals.id"), index=True)
    filename: Mapped[str] = mapped_column(String(300))
    stored_path: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(120), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appeal: Mapped[Appeal] = relationship(back_populates="attachments")


class AppealStatusLog(Base):
    __tablename__ = "appeal_status_log"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appeal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appeals.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40))
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appeal: Mapped[Appeal] = relationship(back_populates="statuses")


class Transfer(Base):
    __tablename__ = "transfers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appeal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appeals.id"), index=True)
    requested_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    appeal: Mapped[Appeal] = relationship(back_populates="transfers")


class CoExecutor(Base):
    __tablename__ = "co_executors"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    appeal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appeals.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    added_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appeal: Mapped[Appeal] = relationship(back_populates="co_executors")


class AdminLog(Base):
    __tablename__ = "admin_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    appeal_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("appeals.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    detail: Mapped[dict] = mapped_column(JSONBCompat, default=dict)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
