import secrets

from app.models.models import ALPHABET


def generate_track_number() -> str:
    """Формат ОТК-XXXX-XXXX, алфавит без визуально спорных символов (0/O,1/I/l)."""
    block1 = "".join(secrets.choice(ALPHABET) for _ in range(4))
    block2 = "".join(secrets.choice(ALPHABET) for _ in range(4))
    return f"ОТК-{block1}-{block2}"
