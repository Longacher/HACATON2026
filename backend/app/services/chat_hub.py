"""Real-time доставка сообщений чата между заявителем и специалистами.

In-memory хаб (один процесс uvicorn) — достаточно для MVP/демо.
Распространение: заявитель подключается по секретному трек-номеру,
специалист — по JWT-токену (ws.py). REST-отправки также публикуются в хаб.
"""

from fastapi import WebSocket


def message_payload(msg) -> dict:
    return {
        "event": "message",
        "id": str(msg.id),
        "author_type": msg.author_type,
        "text": msg.text,
        "created_at": msg.created_at.isoformat(),
    }


class ChatHub:
    def __init__(self):
        self._clients: dict[str, set[WebSocket]] = {}
        # ТЗ 4.4 «Одновременная работа»: кто из специалистов сейчас в карточке
        self._specialists: dict[str, dict[str, str]] = {}

    async def connect(self, appeal_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.setdefault(appeal_id, set()).add(ws)

    def disconnect(self, appeal_id: str, ws: WebSocket) -> None:
        conns = self._clients.get(appeal_id)
        if conns:
            conns.discard(ws)
            if not conns:
                self._clients.pop(appeal_id, None)

    def specialist_join(self, appeal_id: str, user_id: str, name: str) -> None:
        self._specialists.setdefault(appeal_id, {})[user_id] = name

    def specialist_leave(self, appeal_id: str, user_id: str) -> None:
        room = self._specialists.get(appeal_id)
        if room:
            room.pop(user_id, None)
            if not room:
                self._specialists.pop(appeal_id, None)

    def viewers(self, appeal_id: str) -> list[dict]:
        return [
            {"user_id": uid, "name": name}
            for uid, name in self._specialists.get(appeal_id, {}).items()
        ]

    async def broadcast_presence(self, appeal_id: str) -> None:
        await self.broadcast(appeal_id, {"event": "presence", "viewers": self.viewers(appeal_id)})

    async def broadcast(self, appeal_id: str, payload: dict, exclude: WebSocket | None = None) -> None:
        for ws in list(self._clients.get(appeal_id, ())):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(appeal_id, ws)


chat_hub = ChatHub()