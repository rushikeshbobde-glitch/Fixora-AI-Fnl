import os
import tempfile
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

logger = logging.getLogger("fixora")

# Safe writable temp directory for Vercel / AWS Lambda / read-only serverless filesystems
def get_safe_sqlite_path():
    try:
        # Check if local directory is writable
        test_file = "./.write_test"
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        return "./fixora.db"
    except Exception:
        return os.path.join(tempfile.gettempdir(), "fixora.db")

fallback_db = get_safe_sqlite_path()
fallback_url = f"sqlite:///{fallback_db}"

# Detect if PostgreSQL is configured or fallback to SQLite
is_serverless = bool(
    os.getenv("VERCEL") or 
    os.getenv("VERCEL_ENV") or 
    os.getenv("AWS_LAMBDA_FUNCTION_NAME") or 
    os.getenv("LAMBDA_TASK_ROOT") or
    os.getenv("NOW_REGION")
)

# On serverless without explicit external DATABASE_URL env, default directly to safe SQLite
if is_serverless and (not os.getenv("DATABASE_URL") or "localhost" in os.getenv("DATABASE_URL", "")):
    db_url = fallback_url
else:
    db_url = settings.database_url if (settings.database_url and "localhost" not in settings.database_url) else fallback_url

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning("Could not connect to database (%s): %s. Using safe SQLite fallback (%s).", db_url, e, fallback_url)
    engine = create_engine(fallback_url, pool_pre_ping=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
