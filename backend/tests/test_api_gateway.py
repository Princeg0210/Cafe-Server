import importlib

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_login_budget_isolated_by_forwarded_guest_ip(monkeypatch):
    main = importlib.import_module("app.main")

    class FakeRedis:
        def __init__(self):
            self.counts = {}

        async def incr(self, key):
            self.counts[key] = self.counts.get(key, 0) + 1
            return self.counts[key]

        async def expire(self, key, seconds):
            return True

    monkeypatch.setattr(main, "_gateway_redis", FakeRedis())
    app = FastAPI()
    app.middleware("http")(main.api_gateway_limits)

    @app.post("/api/v1/auth/login")
    async def login():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for _ in range(12):
            response = await client.post("/api/v1/auth/login", headers={"X-Forwarded-For": "192.0.2.1"})
            assert response.status_code == 200
            assert response.headers["X-RateLimit-Limit"] == "12"

        blocked = await client.post("/api/v1/auth/login", headers={"X-Forwarded-For": "192.0.2.1"})
        another_guest = await client.post("/api/v1/auth/login", headers={"X-Forwarded-For": "192.0.2.2"})
        assert blocked.status_code == 429
        assert blocked.headers["Retry-After"]
        assert another_guest.status_code == 200
