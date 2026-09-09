"""Аналитика: только агрегаты. Выгрузка — метаданные без текстов и контактов."""
import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import need
from ..db import get_db
from ..models import Appeal, Role, User

router = APIRouter()


@router.get("/api/stats")
def stats(user: User = Depends(need(Role.operator, Role.expert, Role.admin)),
          db: Session = Depends(get_db)):
    by_status = dict(db.query(Appeal.status, func.count()).group_by(Appeal.status).all())
    by_priority = dict(db.query(Appeal.priority, func.count()).group_by(Appeal.priority).all())
    total = db.query(func.count(Appeal.id)).scalar()
    urgent = db.query(func.count(Appeal.id)).filter(
        Appeal.priority == "urgent").scalar()
    returned = db.query(func.count(Appeal.id)).filter(Appeal.returns > 0).scalar()
    return {
        "total": total,
        "by_status": {str(k): v for k, v in by_status.items()},
        "by_priority": {str(k): v for k, v in by_priority.items()},
        "urgent_share": (urgent or 0) / max(total, 1),
        "returned_share": (returned or 0) / max(total, 1),
    }


@router.get("/api/export.csv")
def export(user: User = Depends(need(Role.admin)), db: Session = Depends(get_db)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "status", "priority", "category", "crisis", "returns", "created"])
    for a in db.query(Appeal).order_by(Appeal.id).all():
        w.writerow([a.id, a.status.value, a.priority.value, a.category_id,
                    int(a.crisis), a.returns, a.created_at.isoformat()])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=otklik.csv"})
