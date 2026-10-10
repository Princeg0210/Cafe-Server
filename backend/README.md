# Integrated Café Management System — Backend API & Database (Phase 2)

Production-ready FastAPI backend and PostgreSQL schema implementation for **Jaadoo Udaipur / Café Piza**.

---

## Technical Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0+ (Async with `asyncpg`)
- **Database Migrations**: Alembic
- **Validation**: Pydantic v2
- **Authentication**: Argon2id / Bcrypt + JWT (Access & Refresh tokens)
- **Background Tasks & Workers**: Celery + Redis
- **Real-Time WebSockets**: FastAPI Native WebSockets (`/ws/kitchen`, `/ws/pos`, `/ws/orders`, `/ws/tables`)
- **Testing**: Pytest + `pytest-asyncio` + `httpx`

---

## Key Architecture & Business Rules

### Shared API gateway limits

The website proxies `/api/v1/*` to this API. A Redis-backed middleware limits login attempts to 12/minute/IP, QR validation to 30/minute/IP, writes to 90/minute/client, and reads to 300/minute/client. Authenticated staff are isolated by bearer token. Guest identity uses the first `X-Forwarded-For` address, so the public reverse proxy must overwrite or sanitize that header. The limiter fails open if Redis is unavailable, preserving ordering and reservations; monitor Redis health in production.

### 1. Three Isolated Capacity & Inventory Domains
- **Reservation Capacity** (`reservation_capacity_rules`): Manages seating/guest bookings per time slot.
- **Menu Item Production Capacity** (`item_capacity_rules`): Enforces kitchen output limits (e.g. max 50 pizzas). Exceeding limit raises HTTP 400 `PIZZA_SOLD_OUT`.
- **Ingredient Stock** (`inventory_items` & `recipes`): Real-time raw ingredient tracking.

### 2. Transactional Order Placement & Dual-Kitchen Routing
- Orders execute inside a single atomic database transaction (`BEGIN ... COMMIT`).
- Orders validate production capacity and BOM raw ingredient stock.
- Order items automatically route to **Kitchen 1 (Hot Food)** or **Kitchen 2 (Bar/Beverages)** while preserving 1 master order bill.

### 3. POS Settlement & Idempotency
- Table QR scanner provides `ORDER MENU` and `VIEW BILL` only.
- Final payment settlement occurs strictly at POS counter via `POST /api/v1/bills/{id}/checkout`.
- All monetary values use `NUMERIC(12,2)`.

---

## Local Development & Setup

### Option 1: Docker Compose (Recommended)
```bash
docker-compose up --build
```
API runs on `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### Option 2: Local Python Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## Database Migrations (Alembic)
```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

---

## Automated Pytest Suite
```bash
pytest
```
Tests cover health endpoints, password security, JWT rotation, production capacity limits (`PIZZA_SOLD_OUT`), order creation & dual-kitchen routing, and idempotent POS payment settlement.
