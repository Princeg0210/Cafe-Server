import logging
from typing import Optional
from fastapi import Request, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.tenant import Tenant
from app.core.config import settings

logger = logging.getLogger("restrova.tenant")

DEFAULT_TENANT_SLUG = "restrova-default"


def extract_tenant_slug(request: Request, x_tenant_slug: Optional[str] = None) -> Optional[str]:
    """Extract tenant slug from X-Tenant-Slug header, query param, or Host subdomain."""
    if x_tenant_slug:
        return x_tenant_slug.strip().lower()

    header_slug = request.headers.get("x-tenant-slug")
    if header_slug:
        return header_slug.strip().lower()

    host = request.headers.get("host", "").lower().split(":")[0]

    # Handle standard subdomain: e.g. "luna.restrova.com"
    if ".restrova.com" in host:
        subdomain = host.split(".restrova.com")[0]
        if subdomain and subdomain not in ("www", "api", "app", "demo-api"):
            return subdomain

    # Local development fallback
    if settings.APP_ENV == "development" or host in ("localhost", "127.0.0.1"):
        query_slug = request.query_params.get("tenant")
        if query_slug:
            return query_slug.strip().lower()
        return DEFAULT_TENANT_SLUG

    return None


async def get_current_tenant(
    request: Request,
    x_tenant_slug: Optional[str] = Header(None, alias="X-Tenant-Slug"),
    db: AsyncSession = Depends(get_db),
) -> Tenant:
    """Dependency that mandates an active, valid Tenant context."""
    slug = extract_tenant_slug(request, x_tenant_slug)

    if not slug:
        raise HTTPException(
            status_code=400,
            detail="Tenant context required. Provide X-Tenant-Slug header or visit via tenant subdomain.",
        )

    res = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = res.scalar_one_or_none()

    if not tenant:
        # Check custom domain fallback
        host = request.headers.get("host", "").lower().split(":")[0]
        if host:
            res_domain = await db.execute(select(Tenant).where(Tenant.custom_domain == host))
            tenant = res_domain.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=404,
            detail=f"Café tenant '{slug}' not found on Restrova.",
        )

    if tenant.subscription_status not in ("ACTIVE", "TRIAL"):
        raise HTTPException(
            status_code=402,
            detail="Café subscription expired or inactive. Please contact support to renew.",
        )

    return tenant


async def get_optional_tenant(
    request: Request,
    x_tenant_slug: Optional[str] = Header(None, alias="X-Tenant-Slug"),
    db: AsyncSession = Depends(get_db),
) -> Optional[Tenant]:
    """Dependency that attempts to resolve a tenant if present, otherwise returns None."""
    try:
        return await get_current_tenant(request, x_tenant_slug, db)
    except HTTPException:
        return None
