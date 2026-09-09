"""Трек-номера ОТК-XXXX-XXXX: криптогенерация, хранение только хеша."""
import hashlib
import secrets

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # без 0/O, 1/I/l


def new_track_number() -> str:
    body = "".join(secrets.choice(ALPHABET) for _ in range(8))
    return f"ОТК-{body[:4]}-{body[4:]}"


def track_hash(number: str) -> str:
    return hashlib.sha256(number.strip().upper().encode()).hexdigest()


CRISIS_WORDS = [
    "убью", "убьет", "убьёт", "суицид", "покончить", "вены", "повешусь",
    "изнасил", "избил", "бьет", "бьёт", "угрожа", "нож", "пистолет",
    "умереть", "не хочу жить", "выпрыгну", "отравлюсь",
]


def detect_crisis(text: str, answers: dict) -> bool:
    blob = (text + " " + " ".join(str(v) for v in answers.values())).lower()
    return any(w in blob for w in CRISIS_WORDS)
