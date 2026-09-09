"""WebSocket-чаты (ТЗ 4.4): заявитель по секретному трек-номеру, специалист по токену.

- /ws/appeals/{track}            — заявитель (анонимно, для него трек = пароль).
- /ws/specialist/appeals/{id}    — эксперт (JWT в query), доступ только к своим.
Доставка сообщений — через общий ChatHub; REST-отправки тоже публикуются в него.
"""

import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Appeal, AppealStatus
from app.services.appeals import add_chat_message
from app.services.auth import user_from_token
from app.services.chat_hub import chat_hub, message_payload

router = APIRouter()

CLOSED_STATUSES = (
    AppealStatus.completed,
    AppealStatus.rejected,
    AppealStatus.closed_no_answer,
)


@router.websocket("/ws/appeals/{track}")
async def ws_applicant(websocket: WebSocket, track: str):
    db = next(get_db())
    appeal = db.query(Appeal).filter(Appeal.track_number == track).first()
    if not appeal:
        await websocket.close(code=1008)
        db.close()
        return
    appeal_id = str(appeal.id)
    await chat_hub.connect(appeal_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            text = (data.get("text") or "").strip()
            if not text:
                continue
            if appeal.status in CLOSED_STATUSES:
                await websocket.send_json({"event": "error", "text": "Обращение закрыто"})
                continue
            msg = add_chat_message(db, appeal, "applicant", None, text)
            db.commit()
            payload = message_payload(msg)
            await chat_hub.broadcast(appeal_id, payload, exclude=websocket)
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        chat_hub.disconnect(appeal_id, websocket)
        db.close()


@router.websocket("/ws/specialist/appeals/{appeal_id}")
async def ws_specialist(websocket: WebSocket, appeal_id: str, token: str = Query(...)):
    db = next(get_db())
    user = user_from_token(token, db)
    if not user or user.role.value != "expert":
        await websocket.close(code=1008)
        db.close()
        return
    try:
        appeal_uuid = uuid.UUID(appeal_id)
    except ValueError:
        await websocket.close(code=1008)
        db.close()
        return
    appeal = db.get(Appeal, appeal_uuid)
    if not appeal:
        await websocket.close(code=1008)
        db.close()
        return
    is_responsible = appeal.responsible_expert_id == user.id
    is_co = any(c.user_id == user.id for c in appeal.co_executors)
    if not (is_responsible or is_co):
        await websocket.close(code=1008)
        db.close()
        return
    aid = str(appeal.id)
    uid = str(user.id)
    await chat_hub.connect(aid, websocket)
    chat_hub.specialist_join(aid, uid, user.display_name or user.username)
    await chat_hub.broadcast_presence(aid)
    try:
        while True:
            data = await websocket.receive_json()
            # typing-индикатор транслируем всем в комнате как есть
            if data.get("event") == "typing":
                await chat_hub.broadcast(aid, {"event": "typing", "user_id": uid,
                                               "name": user.display_name or user.username}, exclude=websocket)
                continue
            text = (data.get("text") or "").strip()
            if not text:
                continue
            msg = add_chat_message(db, appeal, "specialist", user, text)
            db.commit()
            payload = message_payload(msg)
            await chat_hub.broadcast(aid, payload, exclude=websocket)
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        chat_hub.specialist_leave(aid, uid)
        chat_hub.disconnect(aid, websocket)
        await chat_hub.broadcast_presence(aid)
        db.close()