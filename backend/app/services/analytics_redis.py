"""Живые агрегаты аналитики в Redis (быстрые счётчики для дашборда).

ТЗ 4.6: показатели в реальном времени без тяжёлых запросов к PostgreSQL.
"""

import json
import os
from datetime import datetime, timezone

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

KEYS = {
    "total": "otklik:agg:total",
    "today": "otklik:agg:today",
    "by_status": "otklik:agg:by_status",
    "by_category": "otklik:agg:by_category",
    "by_type": "otklik:agg:by_type",
    "urgent": "otklik:agg:urgent",
    "crisis": "otklik:agg:crisis",
    "returns": "otklik:agg:returns",
}


class Aggregator:
    def __init__(self):
        self._redis = None

    def _r(self):
        import redis
        if self._redis is None:
            self._redis = redis.Redis.from_url(redis_url, decode_responses=True)
        return self._redis

    def record(self, event: dict):
        r = self._r()
        r.incr(KEYS["total"])
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r.hincrby(KEYS["today"], day, 1)
        if event.get("status"):
            r.hincrby(KEYS["by_status"], event["status"], 1)
        if event.get("category"):
            r.hincrby(KEYS["by_category"], event["category"], 1)
        if event.get("applicant_type"):
            r.hincrby(KEYS["by_type"], event["applicant_type"], 1)
        if event.get("is_crisis"):
            r.incr(KEYS["crisis"])
        if event.get("priority") == "urgent":
            r.incr(KEYS["urgent"])
        if event.get("returned"):
            r.incr(KEYS["returns"])

    def snapshot(self) -> dict:
        r = self._r()
        return {
            "total": r.get(KEYS["total"]) or 0,
            "today": r.hgetall(KEYS["today"]),
            "by_status": r.hgetall(KEYS["by_status"]),
            "by_category": r.hgetall(KEYS["by_category"]),
            "by_type": r.hgetall(KEYS["by_type"]),
            "urgent": r.get(KEYS["urgent"]) or 0,
            "crisis": r.get(KEYS["crisis"]) or 0,
            "returns": r.get(KEYS["returns"]) or 0,
        }


aggregator = Aggregator()