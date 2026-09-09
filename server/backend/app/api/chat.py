"""WebSocket чата: заявитель — по трек-номеру. Presence — следующим этапом."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..db import Session as SessionMaker
from ..models import Appeal, Message
from ..track import track_hash

router = APIRouter()
rooms: dict[int, list[WebSocket]] = {}


@router.websocket("/ws/appeal/{number}")
async def ws_applicant(ws: WebSocket, number: str):
    await ws.accept()
    db: Session = SessionMaker()
    try:
        a = db.query(Appeal).filter_by(track_hash=track_hash(number)).first()
        if not a:
            await ws.close(code=4404)
            return
        rooms.setdefault(a.id, []).append(ws)
        try:
            while True:
                text = await ws.receive_text()
                db.add(Message(appeal_id=a.id, author="applicant", text=text[:2000]))
                db.commit()
                for peer in rooms[a.id]:
                    if peer is not ws:
                        await peer.send_text(text[:2000])
        except WebSocketDisconnect:
            pass
        finally:
            rooms[a.id].remove(ws)
    finally:
        db.close()
