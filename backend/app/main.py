from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
import hashlib
import time
import redis.asyncio as aioredis
from redis.exceptions import RedisError
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

_gateway_redis = aioredis.from_url(
    settings.REDIS_URL,
    socket_connect_timeout=0.15,
    socket_timeout=0.15,
    decode_responses=True,
)


@app.middleware("http")
async def api_gateway_limits(request: Request, call_next):
    """Apply one distributed request budget before API routes reach the database."""
    path = request.url.path
    if not path.startswith("/api/v1/") or request.method == "OPTIONS":
        return await call_next(request)

    if path == "/api/v1/auth/login":
        bucket, limit = "login", 12
    elif path == "/api/v1/tables/qr/validate":
        bucket, limit = "qr", 30
    elif request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        bucket, limit = "write", 90
    else:
        bucket, limit = "read", 300

    # Bearer tokens isolate staff behind the same network; guests use their IP.
    bearer = request.headers.get("authorization", "")
    # The same-origin website proxy forwards the guest IP; without it every
    # guest would share the website server's request budget.
    forwarded_ip = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    client_ip = forwarded_ip or (request.client.host if request.client else "unknown")
    identity = bearer if bucket not in {"login", "qr"} and bearer.startswith("Bearer ") else client_ip
    digest = hashlib.sha256(identity.encode()).hexdigest()[:24]
    window = int(time.time() // 60)
    key = f"gateway:{bucket}:{digest}:{window}"
    try:
        count = await _gateway_redis.incr(key)
        if count == 1:
            await _gateway_redis.expire(key, 61)
        if count > limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again shortly."},
                headers={"Retry-After": str(60 - int(time.time()) % 60)},
            )
    except RedisError:
        # Keep ordering available if the rate-limit store is temporarily down.
        pass

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    return response

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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error(f"Global unhandled exception: {tb}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc), "type": type(exc).__name__, "traceback": tb},
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
                if "is_deposit_credited" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN is_deposit_credited BOOLEAN DEFAULT 0"))
                if "credited_bill_id" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN credited_bill_id INTEGER"))
                if "cancellation_refund_amount" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN cancellation_refund_amount NUMERIC(10, 2) DEFAULT 0.00"))
                if "cancellation_refund_status" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN cancellation_refund_status VARCHAR(30)"))
                if "expected_pizza_count" not in cols:
                    await conn.execute(text("ALTER TABLE reservations ADD COLUMN expected_pizza_count INTEGER"))


                sess_cols = await conn.execute(text("PRAGMA table_info(dining_sessions)"))
                s_cols = [c[1] for c in sess_cols.fetchall()]
                if "reservation_id" not in s_cols:
                    await conn.execute(text("ALTER TABLE dining_sessions ADD COLUMN reservation_id INTEGER"))

                bill_cols = await conn.execute(text("PRAGMA table_info(bills)"))
                b_cols = [c[1] for c in bill_cols.fetchall()]
                if "reservation_deposit_paid" not in b_cols:
                    await conn.execute(text("ALTER TABLE bills ADD COLUMN reservation_deposit_paid NUMERIC(12, 2) DEFAULT 0.00"))
                if "reservation_credit" not in b_cols:
                    await conn.execute(text("ALTER TABLE bills ADD COLUMN reservation_credit NUMERIC(12, 2) DEFAULT 0.00"))
                if "remainder_action" not in b_cols:
                    await conn.execute(text("ALTER TABLE bills ADD COLUMN remainder_action VARCHAR(30)"))
                if "remainder_amount" not in b_cols:
                    await conn.execute(text("ALTER TABLE bills ADD COLUMN remainder_amount NUMERIC(12, 2) DEFAULT 0.00"))

                credit_cols = await conn.execute(text("PRAGMA table_info(verified_bank_credits)"))
                v_cols = [c[1] for c in credit_cols.fetchall()]
                if "event_id" not in v_cols:
                    await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN event_id VARCHAR(100)"))
                if "raw_event_payload" not in v_cols:
                    await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN raw_event_payload VARCHAR(500)"))
                if "review_reason" not in v_cols:
                    await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN review_reason VARCHAR(200)"))
                if "is_claimed" not in v_cols:
                    await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN is_claimed BOOLEAN DEFAULT 0"))
                if "claimed_reservation_id" not in v_cols:
                    await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN claimed_reservation_id INTEGER"))
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
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_deposit_credited BOOLEAN DEFAULT FALSE"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS credited_bill_id INTEGER"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_refund_amount NUMERIC(10, 2) DEFAULT 0.00"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_refund_status VARCHAR(30)"))
                await conn.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS expected_pizza_count INTEGER"))


                await conn.execute(text("ALTER TABLE dining_sessions ADD COLUMN IF NOT EXISTS reservation_id INTEGER"))

                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS reservation_deposit_paid NUMERIC(12, 2) DEFAULT 0.00"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS reservation_credit NUMERIC(12, 2) DEFAULT 0.00"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS remainder_action VARCHAR(30)"))
                await conn.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS remainder_amount NUMERIC(12, 2) DEFAULT 0.00"))

                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS event_id VARCHAR(100)"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS raw_event_payload VARCHAR(500)"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS review_reason VARCHAR(200)"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS claimed_reservation_id INTEGER"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS merchant_vpa VARCHAR(100) DEFAULT '9460555743-2@ybl'"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS payer_vpa VARCHAR(100)"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS provider_source VARCHAR(50) DEFAULT 'ANDROID_LISTENER'"))
                await conn.execute(text("ALTER TABLE verified_bank_credits ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'SETTLED'"))

            try:
                await conn.execute(text("UPDATE tables SET table_number = 'Table 1' WHERE id IN (1, 4, 7, 9, 11)"))
                await conn.execute(text("UPDATE tables SET table_number = 'Table 2' WHERE id IN (2, 5, 8, 10, 12)"))
                await conn.execute(text("UPDATE tables SET table_number = 'Table 3' WHERE id IN (3, 6, 13)"))
            except Exception:
                pass

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

        # Create default POS cashier / owner admin accounts if missing (never overwrites existing ones)
        from app.utils.create_pos_user import ensure_default_users
        await ensure_default_users()
        logger.info("Default POS and Owner Admin users ensured.")

        # Ensure default tables (1 to 12) and their secure TableQR tokens exist
        async with AsyncSessionLocal() as db:
            from app.utils.init_tables import ensure_default_tables
            await ensure_default_tables(db)
        logger.info("Default tables and QR tokens ensured.")

        async with AsyncSessionLocal() as db:
            from app.utils.init_inventory import ensure_raw_materials
            await ensure_raw_materials(db)
        logger.info("Raw material inventory ensured.")
    except Exception as e:
        logger.warning(f"Database schema auto-init warning: {e}")

