import urllib.parse
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Clean and normalize query parameters for asyncpg compatibility
if "+asyncpg" in db_url and "?" in db_url:
    base_part, query_part = db_url.split("?", 1)
    params = urllib.parse.parse_qs(query_part)
    clean_params = {}
    for k, v in params.items():
        if k in ("sslmode", "ssl"):
            clean_params["ssl"] = "require"
        elif k not in ("channel_binding", "target_session_attrs"):
            clean_params[k] = v[0]
    if clean_params:
        db_url = base_part + "?" + urllib.parse.urlencode(clean_params)
    else:
        db_url = base_part

is_sqlite = "sqlite" in db_url
engine_kwargs = {"echo": False, "future": True}
if not is_sqlite:
    engine_kwargs.update({"pool_pre_ping": True, "pool_size": 15, "max_overflow": 5, "pool_timeout": 30})
else:
    engine_kwargs.update({"connect_args": {"check_same_thread": False}})

engine = create_async_engine(db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
