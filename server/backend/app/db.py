import os

from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://otklik:otklik@localhost:5432/otklik"
    jwt_secret: str = "change-me-in-prod"
    jwt_minutes: int = 8 * 60
    seed_demo: bool = False
    upload_dir: str = os.path.join(os.path.dirname(__file__), "..", "uploads")


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
Session = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()
