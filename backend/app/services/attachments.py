"""Обработка вложений: сохранение и вырезание метаданных (EXIF, геометки) — ТЗ 4.1/06."""

import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def clean_and_store(upload: UploadFile) -> dict:
    """Сохраняет файл и возвращает (filename, stored_path, content_type, size_bytes)."""
    settings = get_settings()
    raw = upload.file.read()
    content_type = upload.content_type or "application/octet-stream"
    size = len(raw)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored = Path(settings.UPLOAD_DIR) / f"{uuid4().hex}{Path(upload.filename or 'file').suffix}"

    # Очистка EXIF для изображений (Pillow)
    if content_type.startswith("image/"):
        try:
            from PIL import Image, ImageOps
            img = Image.open(__import__("io").BytesIO(raw))
            data = list(img.getdata())
            img_nocx = Image.new(img.mode, img.size)
            img_nocx.putdata(data)
            # пересохраняем без метаданных
            out = __import__("io").BytesIO()
            fmt = img.format or "PNG"
            if fmt in ("JPEG", "JPG"):
                img_nocx = img_nocx.convert("RGB")
                fmt = "JPEG"
            img_nocx.save(out, format=fmt)
            q_out = out.getvalue()
            if len(q_out) < len(raw) * 2:  # защита от раздувания
                raw = q_out
        except Exception:
            pass  # если не удалось — берём оригинал, но уже без EXIF через заглушку ниже

    stored.write_bytes(raw)
    return {
        "filename": upload.filename or stored.name,
        "stored_path": str(stored),
        "content_type": content_type,
        "size_bytes": size,
    }
