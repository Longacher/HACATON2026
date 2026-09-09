from uuid import UUID

from pydantic import BaseModel, Field

from app.models.models import ApplicantType, AppealStatus, Priority


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    display_name: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    display_name: str = ""
    max_active_appeals: int = 10


class UserOut(BaseModel):
    id: UUID
    username: str
    role: str
    display_name: str
    active: bool

    model_config = {"from_attributes": True}


# ---- Оператор ----

class ProcessItem(BaseModel):
    category_id: UUID | None = None
    priority: Priority = Priority.standard
    expert_id: UUID | None = None
    action: str = "assign"  # assign | close | reject
    reason: str | None = None


class RejectRequest(BaseModel):
    reason: str


class ReturnResolution(BaseModel):
    action: str  # reassign | close
    expert_id: UUID | None = None
    explanation: str | None = None


# ---- Эксперт ----

class StatusChange(BaseModel):
    to_status: AppealStatus
    comment: str | None = None


class TransferRequest(BaseModel):
    reason: str


class TransferResolve(BaseModel):
    new_expert_id: UUID
    confirm: bool = True


# ---- Админ ----

class CategoryCreate(BaseModel):
    name: str
    is_free_fallback: bool = False
    order: int = 0


class RoutingRuleCreate(BaseModel):
    category_id: UUID
    group_id: UUID


class GroupCreate(BaseModel):
    name: str
    display_label: str = ""


class AdminAppealAction(BaseModel):
    status: AppealStatus | None = None
    priority: Priority | None = None
    expert_id: UUID | None = None
    reason: str
