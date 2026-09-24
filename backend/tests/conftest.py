import os
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base
from app.main import app
from app.api.deps import get_db
from httpx import AsyncClient, ASGITransport

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///cafe_test.db"
)

connect_args = {"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
engine = create_async_engine(TEST_DATABASE_URL, echo=False, connect_args=connect_args)
TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


from app.api.deps import get_db, get_current_user
from app.models.user import User, Role


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return User(id=1, username="test_cashier", email="cashier@example.com", is_active=True, role=Role(id=1, name="Admin"))

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_celery_send_task():
    with patch("app.workers.celery_app.celery_app.send_task") as mock:
        yield mock
