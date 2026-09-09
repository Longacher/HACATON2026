"""Rate-limit проверки трек-номера (ТЗ 4.7): не более N попыток в минуту с адреса.

Адрес НЕ сохраняется в БД — только в оперативной памяти (в Redis при масштабировании).
"""

import threading
import time

MAX_PER_MINUTE_DEFAULT = 5

_lock = threading.Lock()
_attempts: dict[str, list[float]] = {}


def check_track_attempts(client_key: str, limit: int = MAX_PER_MINUTE_DEFAULT) -> bool:
    """Возвращает True, если разрешено, False если превышен лимит (нужна задержка)."""
    now = time.time()
    with _lock:
        times = _attempts.get(client_key, [])
        times = [t for t in times if now - t < 60]
        if len(times) >= limit:
            _attempts[client_key] = times
            return False
        times.append(now)
        _attempts[client_key] = times
        return True
