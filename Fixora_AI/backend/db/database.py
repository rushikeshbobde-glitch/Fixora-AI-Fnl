import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

logger = logging.getLogger("fixora")

db_url = settings.database_url
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning("Could not connect to configured PostgreSQL database (%s): %s. Using SQLite fallback.", db_url, e)
    engine = create_engine("sqlite:///./fixora.db", pool_pre_ping=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
