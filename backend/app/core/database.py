import urllib.parse
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

raw_url = settings.DATABASE_URL
db_url = raw_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

is_sqlite = "sqlite" in db_url
needs_ssl = not is_sqlite and any(k in raw_url.lower() for k in ("ssl", "neon.tech", "render.com", "aws.neon.tech"))

# Strip query string completely from asyncpg URL so driver never passes invalid args to asyncpg.connect
if "+asyncpg" in db_url:
    db_url = db_url.split("?")[0]

engine_kwargs = {"echo": False, "future": True}
if not is_sqlite:
    conn_args = {"ssl": "require"} if needs_ssl else {}
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 15,
        "max_overflow": 5,
        "pool_timeout": 30,
        "connect_args": conn_args,
    })
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
