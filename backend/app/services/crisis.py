"""Детекция кризисных обращений по словарю (ТЗ 5.3). ML не требуется."""

# Кризисные маркеры (нижний регистр). Словарь достаточен по ТЗ.
CRISIS_MARKERS = [
    "хочу умереть",
    "не хочу жить",
    "убить себя",
    "самоубийств",
    "суицид",
    "покончить с собой",
    "лишить себя жизни",
    "ударить",
    "изби",
    "побои",
    "изнасилов",
    "насили",
    "угрожа",
    "угроз",
    "убить",
    "ножиком",
    "нож",
    "оружи",
    "заставить",
    "принуди",
]


def detect_crisis(text: str | None, answers: dict | None = None) -> tuple[bool, list[str]]:
    """Возвращает (is_crisis, найденные маркеры)."""
    haystack = ""
    if text:
        haystack += " " + text.lower()
    if answers:
        for v in answers.values():
            if isinstance(v, str):
                haystack += " " + v.lower()
    found = [m for m in CRISIS_MARKERS if m in haystack]
    return bool(found), found
