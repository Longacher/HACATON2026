from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.models import ApplicantType, AppealStatus, Priority


class CategoryOut(BaseModel):
    id: UUID
    name: str
    is_free_fallback: bool

    model_config = {"from_attributes": True}


class AppealCreate(BaseModel):
    applicant_type: ApplicantType
    is_category_path: bool = False
    category_id: UUID | None = None
    free_text: str | None = None
    answers: dict = Field(default_factory=dict)
    contact_name: str | None = Field(default=None, max_length=50)
    contact_value: str | None = Field(default=None, max_length=200)
    contact_consent: bool = False


class AppealBrief(BaseModel):
    id: UUID
    track_number: str
    status: AppealStatus
    priority: Priority
    is_crisis: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: UUID
    author_type: str
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    text: str = Field(..., min_length=1)


class StatusLogOut(BaseModel):
    from_status: str | None
    to_status: str
    created_at: datetime
    comment: str | None

    model_config = {"from_attributes": True}


class AppealDetail(BaseModel):
    id: UUID
    track_number: str
    status: AppealStatus
    priority: Priority
    is_crisis: bool
    created_at: datetime
    messages: list[MessageOut] = Field(default_factory=list)
    statuses: list[StatusLogOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}
