from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/otklik"

    SECRET_KEY: str = "change-me-in-production"

    # Трек-номер
    TRACK_MIN_SIGNIFICANT: int = 8
    TRACK_CHECK_RATE_LIMIT_MINUTE: int = 5

    # Вложения
    MAX_ATTACHMENTS: int = 5
    MAX_ATTACHMENT_MB: int = 10
    UPLOAD_DIR: str = "uploads"

    # Кризис: дни до автоматического закрытия "без ответа"
    AUTO_CLOSE_DAYS: int = 30

    # Возвраты: разумный лимит
    MAX_RETURNS: int = 2

    # CORS (разрешённые origins)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
