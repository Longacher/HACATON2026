"""Аналитика (ТЗ 4.6): дашборд и обезличенная выгрузка CSV/XLSX."""

import csv
import io
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.models import Appeal, AppealStatus, ApplicantType, Category, User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnalyticsService:
    @staticmethod
    def dashboard(db: Session, period_days: int = 30) -> dict:
        since = _utcnow() - pd_timedelta(days=period_days)
        appeals = (
            db.execute(select(Appeal).where(Appeal.created_at >= since)).scalars().all()
        )
        total = len(appeals)
        by_category = {}
        by_type = {}
        by_status = {}
        urgent = 0
        returns = 0
        t_sum_since_accept = 0.0
        t_sum_first_reply = 0.0
        t_sum_close = 0.0
        n_accept = 0
        n_first_reply = 0
        n_close = 0
        crisis = 0
        for a in appeals:
            cat = "без категории"
            if a.category_id:
                c = db.get(Category, a.category_id)
                cat = c.name if c else "без категории"
            by_category[cat] = by_category.get(cat, 0) + 1
            by_type[a.applicant_type.value] = by_type.get(a.applicant_type.value, 0) + 1
            by_status[a.status.value] = by_status.get(a.status.value, 0) + 1
            if a.priority.value == "urgent":
                urgent += 1
            if a.is_crisis:
                crisis += 1
            if a.return_count and a.return_count > 0:
                returns += 1
            if a.operator_taken_at:
                t_sum_since_accept += (a.operator_taken_at - a.created_at).total_seconds()
                n_accept += 1
            if a.first_expert_reply_at and a.taken_at:
                t_sum_first_reply += (a.first_expert_reply_at - a.taken_at).total_seconds()
                n_first_reply += 1
            if a.closed_at:
                t_sum_close += (a.closed_at - a.created_at).total_seconds()
                n_close += 1

        # нагрузка по специалистам
        operators = db.execute(
            select(User).where(User.role == "operator")
        ).scalars().all()
        experts = db.execute(select(User).where(User.role == "expert")).scalars().all()
        active_statuses = [
            AppealStatus.new, AppealStatus.assigned, AppealStatus.in_progress,
            AppealStatus.need_clarification, AppealStatus.answer_ready, AppealStatus.returned,
        ]
        active_counts = (
            db.execute(
                select(Appeal.responsible_expert_id, func.count(Appeal.id))
                .where(Appeal.status.in_(active_statuses), Appeal.responsible_expert_id.isnot(None))
                .group_by(Appeal.responsible_expert_id)
            ).all()
        )
        load = {str(rid): cnt for rid, cnt in active_counts}
        op_counts = (
            db.execute(
                select(Appeal.operator_id, func.count(Appeal.id))
                .where(Appeal.status.in_(active_statuses), Appeal.operator_id.isnot(None))
                .group_by(Appeal.operator_id)
            ).all()
        )
        op_load = {str(rid): cnt for rid, cnt in op_counts}

        return {
            "period_days": period_days,
            "total": total,
            "by_category": by_category,
            "by_applicant_type": by_type,
            "by_status": by_status,
            "urgent": urgent,
            "crisis": crisis,
            "returns": returns,
            "avg_time_to_accept_sec": round(t_sum_since_accept / n_accept, 2) if n_accept else None,
            "avg_time_to_first_reply_sec": round(t_sum_first_reply / n_first_reply, 2) if n_first_reply else None,
            "avg_time_to_close_sec": round(t_sum_close / n_close, 2) if n_close else None,
            "operator_count": len(operators),
            "expert_count": len(experts),
            "expert_load": {u.display_name: load.get(str(u.id), 0) for u in experts},
            "operator_load": {u.display_name: op_load.get(str(u.id), 0) for u in operators},
        }

    @staticmethod
    def report_rows(db: Session, period_days: int = 30) -> list[list]:
        """Строки обезличенной выгрузки: только метаданные, БЕЗ текстов и контактов (ТЗ 4.6)."""
        since = _utcnow() - pd_timedelta(days=period_days)
        rows = (
            db.execute(select(Appeal).where(Appeal.created_at >= since)).scalars().all()
        )
        return [
            [
                str(a.id), a.created_at.isoformat(), a.applicant_type.value,
                str(a.category_id) if a.category_id else "", a.priority.value,
                a.status.value, 1 if a.is_crisis else 0, a.return_count,
                a.closed_at.isoformat() if a.closed_at else "",
            ]
            for a in rows
        ]

    @staticmethod
    def report_csv(db: Session, period_days: int = 30) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "created_at", "applicant_type", "category_id", "priority",
            "status", "is_crisis", "return_count", "closed_at",
        ])
        writer.writerows(AnalyticsService.report_rows(db, period_days))
        return buf.getvalue()


def pd_timedelta(days: int):
    from datetime import timedelta
    return timedelta(days=days)
