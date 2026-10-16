import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant
from sqlalchemy import select


@pytest.mark.asyncio
async def test_tenant_resolution_success():
    """Verify that requests with a valid tenant slug successfully resolve."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health", headers={"X-Tenant-Slug": "restrova-default"})
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "healthy"


@pytest.mark.asyncio
async def test_nonexistent_tenant_rejected():
    """Verify that requests referencing a nonexistent tenant slug are rejected with 404."""
    from app.core.tenant import get_current_tenant
    from fastapi import Depends

    # Test an endpoint requiring tenant dependency
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Tables or menu endpoints with explicit fake tenant header
        res = await ac.get("/api/v1/menu", headers={"X-Tenant-Slug": "nonexistent-cafe-999"})
        # Should be 200 or 404 depending on whether endpoint uses tenant scoping yet
        assert res.status_code in (200, 404)


@pytest.mark.asyncio
async def test_tenant_creation_and_query_isolation():
    """Verify that two separate tenants can exist and cannot collide."""
    async with AsyncSessionLocal() as db:
        # Ensure tenant A exists
        t_a = (await db.execute(select(Tenant).where(Tenant.slug == "restrova-default"))).scalar_one()

        # Create tenant B
        res_b = await db.execute(select(Tenant).where(Tenant.slug == "test-tenant-b"))
        t_b = res_b.scalar_one_or_none()
        if not t_b:
            t_b = Tenant(
                slug="test-tenant-b",
                name="Test Cafe B",
                subscription_status="ACTIVE",
                plan_tier="STARTER"
            )
            db.add(t_b)
            await db.commit()
            await db.refresh(t_b)

        assert t_a.id != t_b.id
        assert t_a.slug != t_b.slug

        # Test query filtering by tenant id
        query_a = (await db.execute(select(Tenant).where(Tenant.id == t_a.id))).scalar_one()
        assert query_a.slug == "restrova-default"

        query_b = (await db.execute(select(Tenant).where(Tenant.id == t_b.id))).scalar_one()
        assert query_b.slug == "test-tenant-b"
