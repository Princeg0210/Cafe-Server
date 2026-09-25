from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import setup_logging, logger
from app.api.v1 import api_v1_router
from app.api.websocket import router as ws_router

setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    description="Production FastAPI Backend for Integrated Café Management System (Jaadoo Udaipur)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


# Health checks
@app.get("/health", tags=["Health Checks"])
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


@app.get("/health/db", tags=["Health Checks"])
async def health_check_db():
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            if val == 1:
                return {"status": "healthy", "database": "PostgreSQL connected"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "database": str(e)},
        )


@app.get("/health/redis", tags=["Health Checks"])
async def health_check_redis():
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        pong = await r.ping()
        await r.aclose()
        if pong:
            return {"status": "healthy", "redis": "Redis connected"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "redis": str(e)},
        )


# Include API and WebSockets routers
app.include_router(api_v1_router, prefix="/api")
app.include_router(ws_router)


@app.on_event("startup")
async def on_startup():
    import app.models
    from app.core.database import Base, engine
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            is_sqlite = "sqlite" in settings.DATABASE_URL
            if is_sqlite:
                res_cols = await conn.execute(text("PRAGMA table_info(reservations)"))
                cols = [c[1] for c in res_cols.fetchall()]
                if "table_id" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN table_id INTEGER"))
                if "floor_number" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN floor_number INTEGER DEFAULT 1"))
                if "table_name" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN table_name VARCHAR(50)"))
                if "payment_status" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN payment_status VARCHAR(20) DEFAULT 'PAID'"))
                if "advance_amount" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN advance_amount NUMERIC(10, 2) DEFAULT 0.00"))
                if "payment_reference" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN payment_reference VARCHAR(64)"))
                if "payment_method" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN payment_method VARCHAR(30)"))
                if "hold_expires_at" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN hold_expires_at TIMESTAMP"))
                if "upi_id" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN upi_id VARCHAR(100)"))
                if "upi_utr" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN upi_utr VARCHAR(100)"))
            else:
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_id INTEGER"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS floor_number INTEGER DEFAULT 1"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_name VARCHAR(50)"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PAID'"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10, 2) DEFAULT 0.00"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(64)"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30)"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP WITHOUT TIME ZONE"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100)"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS upi_utr VARCHAR(100)"))
        logger.info("Database schema initialized successfully.")

        async with AsyncSessionLocal() as db:
            from app.models.branch import Branch
            from app.models.kitchen import Kitchen
            from sqlalchemy import select
            res = await db.execute(select(Branch))
            if not res.scalar_one_or_none():
                branch = Branch(name="Jaadoo Udaipur", address="Chandpole, Udaipur", phone="+919876543210")
                db.add(branch)
                await db.flush()
                k1 = Kitchen(branch_id=branch.id, name="Main Kitchen")
                db.add(k1)
                await db.commit()
                logger.info("Default branch and main kitchen seeded.")

        # Ensure POS cashier user and pos:access permissions exist in any environment (Render / Local)
        from app.utils.create_pos_user import create_pos_user
        await create_pos_user()
        logger.info("Default POS user ensured.")

        # Ensure default tables (1 to 12) and their secure TableQR tokens exist
        async with AsyncSessionLocal() as db:
            from app.utils.init_tables import ensure_default_tables
            await ensure_default_tables(db)
        logger.info("Default tables and QR tokens ensured.")
    except Exception as e:
        logger.warning(f"Database schema auto-init warning: {e}")

