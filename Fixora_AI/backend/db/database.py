import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

logger = logging.getLogger("fixora")

# Use /tmp directory for SQLite on serverless platforms (Vercel / AWS Lambda)
fallback_db = "/tmp/fixora.db" if (os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME")) else "./fixora.db"
fallback_url = f"sqlite:///{fallback_db}"

db_url = settings.database_url if settings.database_url else fallback_url
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning("Could not connect to configured database (%s): %s. Using SQLite fallback (%s).", db_url, e, fallback_url)
    engine = create_engine(fallback_url, pool_pre_ping=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
