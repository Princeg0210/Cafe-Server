# 🏛️ Jaadoo Café Piza — Complete Technical Architecture & Codebase Guide

> **Repository:** `https://github.com/Princeg0210/Cafe-Server.git`  
> **Location / Branch:** Jaadoo Udaipur (Chandpole, Lake Pichola view)  
> **System Scope:** Production-grade integrated cafe management, tabletop QR ordering, POS cashier billing, table concurrency protection, 0% commission direct-to-bank UPI payment verification, two-tier pizza & dough capacity protection, recipe BOM stock deduction, and ESC/POS thermal printing.

---

## 1. Core Architectural Principles & Philosophy

1. **PostgreSQL as Single Source of Truth**:
   - All financial balances, order states, table occupancy sessions, inventory stock, verified bank credits, and reservations reside strictly in PostgreSQL with row-level locks (`SELECT ... FOR UPDATE`).
   - Partial unique indices (e.g. `idx_unique_active_dining_session_per_table`) enforce atomic single-active-session constraints per physical table.

2. **0% Gateway Commission Direct Bank UPI Verification**:
   - Generates direct merchant UPI payment intent strings (`upi://pay?pa=9460555743-2@ybl&am=...&tn=TableRes_<id>`) for 0% commission.
   - **Fraud-Proof Anti-Replay Engine**: Customer-entered 12-digit UTRs **NEVER** self-confirm reservations. A booking is only confirmed when an authentic credit arrives from an independent bank notification webhook or Android payment listener recorded in `verified_bank_credits`.

3. **Physical Thermal KOTs (ONE Kitchen, NO KDS Screens)**:
   - Jaadoo Café operates a single physical kitchen station. Kitchen display screens (KDS) are intentionally bypassed/deprecated; instead, tickets are dispatched directly to thermal receipt printers over raw TCP socket (`Port 9100`) via Celery background workers.
   - KOTs carry sequential daily numbers (`KOT-001`, `KOT-002`), bold item lines, and cooking notes. Reprints are visibly watermarked `*** DUPLICATE REPRINT ***`.

---

## 2. Directory & File System Map

```text
Cafe-Server/
├── backend/
│   ├── alembic/                           # Schema migrations (001_initial, 002_phase3, 003_dough_production)
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                    # Auth, DB dependency, permissions, token checks
│   │   │   ├── websocket.py               # Real-time WebSocket connection manager (pos, kitchen, tables, orders)
│   │   │   └── v1/
│   │   │       ├── analytics.py           # Revenue and orders summary metrics
│   │   │       ├── auth.py                # Staff login, JWT token issuance & refresh
│   │   │       ├── billing.py             # Running bills and checkout settlement
│   │   │       ├── inventory.py           # Stock ledger and reorder threshold queries
│   │   │       ├── kitchen.py             # Kitchen order status and reprint triggers
│   │   │       ├── menu.py                # Menu item listing with live capacity state
│   │   │       ├── orders.py              # Order placement and order detail retrieval
│   │   │       ├── pos.py                 # Live KOTs, table sessions, summary, reset
│   │   │       ├── reservations.py        # Holds, UPI verify, webhooks, check-in
│   │   │       └── tables.py              # QR validation, session creation, rotate QR
│   │   ├── core/
│   │   │   ├── config.py                  # Pydantic Settings (DB URLs, UPI IDs, policies)
│   │   │   ├── database.py                # Async SQLAlchemy engine & AsyncSessionLocal
│   │   │   ├── logging.py                 # Structured logger configuration
│   │   │   └── security.py                # Argon2/BCrypt hashing & PyJWT tokens
│   │   ├── models/                        # SQLAlchemy 2.0 ORM Declarative Models
│   │   │   ├── audit.py                   # AuditLog table
│   │   │   ├── bank_transaction.py        # VerifiedBankCredit (authentic payments)
│   │   │   ├── billing.py                 # Bill and Payment tables
│   │   │   ├── branch.py                  # Branch table
│   │   │   ├── capacity.py                # ItemCapacityRule, DailyProductionRule, ReservationDoughAllocation
│   │   │   ├── customer.py                # Customer profiles
│   │   │   ├── feedback.py                # Customer reviews
│   │   │   ├── inventory.py               # Recipe, RecipeItem, InventoryItem, InventoryTransaction
│   │   │   ├── kitchen.py                 # Kitchen, MenuItemKitchenMapping, KitchenOrder, PrintJob
│   │   │   ├── kot.py                     # KOT (Kitchen Order Ticket with daily sequence)
│   │   │   ├── menu.py                    # MenuCategory and MenuItem
│   │   │   ├── notification.py            # Notification logs
│   │   │   ├── order.py                   # Order and OrderItem
│   │   │   ├── reservation.py             # Reservation and ReservationCapacityRule
│   │   │   ├── settings.py                # SystemSettings (dynamic key-value store)
│   │   │   ├── supplier.py                # Suppliers and Purchase Orders
│   │   │   ├── table.py                   # Table, TableQR, DiningSession
│   │   │   └── user.py                    # User, Role, Permission, RolePermission
│   │   ├── schemas/                       # Pydantic v2 Request/Response validation schemas
│   │   ├── services/                      # Pure Domain Business Logic
│   │   │   ├── billing_service.py         # Subtotals, tax, deposit deduction, refunds
│   │   │   ├── capacity_service.py        # Oven hourly limit & daily pizza dough pool
│   │   │   ├── inventory_service.py       # Stock validation & BOM deduction
│   │   │   ├── kitchen_service.py         # Status updates & thermal print job records
│   │   │   ├── order_service.py           # Atomic order placement coordinator
│   │   │   ├── payment_verification_service.py # Fraud-proof bank ledger matching
│   │   │   ├── pos_service.py             # Table hierarchy, KOT history, analytics
│   │   │   ├── reservation_service.py     # 7-min holds, grace periods, table assignment
│   │   │   ├── settings_service.py        # Dynamic configuration getter/setter
│   │   │   └── table_service.py           # Concurrency-safe session management
│   │   ├── utils/
│   │   │   ├── create_pos_user.py         # Creates default cashier & permissions
│   │   │   ├── helpers.py                 # UTC/IST time converters, reservation window
│   │   │   ├── init_tables.py             # Idempotently seeds Tables 1–12 & QR tokens
│   │   │   └── seed_data.py               # Seeds categories, pizzas, recipes, stock
│   │   ├── workers/
│   │   │   └── celery_app.py              # Celery thermal printer worker & reminder scheduler
│   │   └── main.py                        # FastAPI application entrypoint & startup hooks
│   └── tests/                             # Pytest Async Test Suite (17 test files)
├── frontend/                              # Next.js 14 App Router Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── book-table/page.tsx        # Customer table booking with 7-min UPI hold
│   │   │   ├── table/[token]/page.tsx     # Tabletop QR self-ordering & running bill
│   │   │   ├── pos/page.tsx               # Staff billing, live KOTs, and table management
│   │   │   ├── kds/page.tsx               # Redirects to /pos (Single-Kitchen architecture)
│   │   │   ├── menu/page.tsx              # Public interactive digital menu
│   │   │   ├── layout.tsx                 # Root layout, fonts, metadata
│   │   │   └── page.tsx                   # Main restaurant landing page
│   │   ├── components/
│   │   │   ├── CartDrawer.tsx             # Slide-out cart for tabletop ordering
│   │   │   ├── PaymentModal.tsx           # Dynamic UPI QR modal with live countdown
│   │   │   ├── Navbar.tsx & TanFooter.tsx # Editorial brand headers and footers
│   │   │   └── MorphingCardsShowcase.tsx  # Dynamic UI showcases
│   │   └── data/
│   │       └── menu.ts                    # Hardcoded menu definitions with SKU mapping
└── PROJECT_ARCHITECTURE.md                # Technical blueprint
```

---

## 3. End-to-End Execution Lifecycles

### A. Reservation & 0% Bank UPI Flow
1. **Hold Request (`POST /api/v1/reservations/hold`)**:
   - Customer submits date, time slot, and guest count.
   - Slot capacity checked against `ReservationCapacityRule.max_guest_capacity` (default 80).
   - Deposit calculated with `Decimal` precision: $\text{guest\_count} \times ₹200.00$.
   - Record created with `status="HOLD"` and `hold_expires_at = NOW() + 7 minutes`.
   - Returns NPCI UPI URL: `upi://pay?pa=9460555743-2@ybl&pn=Jaadoo%20Cafe%20Piza&am=...&tn=TableRes_<id>`.
2. **Customer Payment Submission (`POST /api/v1/reservations/{id}/verify-upi`)**:
   - Customer enters 12-digit UPI UTR.
   - Status transitions to `PAYMENT_PENDING` (never self-confirms!).
   - Calls `PaymentVerificationService.verify_and_claim_credit()`.
3. **Settlement Verification**:
   - Android Listener or Bank Webhook posts to `/api/v1/reservations/android-payment-event`.
   - Incoming transaction matched with reservation UTR/amount and status becomes `CONFIRMED` (`PAID`).
   - Automatically allocates protected pizza dough for the booking (`guest_count * 0.75`).
   - If payment arrives after 7 minutes have passed, it is flagged as `PAYMENT_REVIEW_REQUIRED` for cashier inspection.

### B. Table QR Dining Session & Concurrency
1. **QR Scan (`POST /api/v1/tables/qr/validate`)**:
   - Customer scans tabletop standee QR (`qr_sec_...`).
   - Validates active token, acquires row-level lock (`SELECT ... FOR UPDATE`), and gets or creates `DiningSession` (`OPENED`).
2. **Reservation Conflict Windowing**:
   - If the table is reserved in >90 minutes: Walk-in dining allowed without interruption.
   - If reserved in 30–90 minutes: "Quick Dine" banner displayed indicating remaining dining minutes.
   - If reserved >15 minutes in the past without guest check-in: Auto-released as `NO_SHOW`.

### C. Order Placement Pipeline (`POST /api/v1/orders`)
1. **Atomic Transaction Coordinator**:
   - Session row locked for update.
   - **Oven Capacity Check**: `CapacityService.validate_and_allocate()` verifies hourly limit and daily dough pool.
   - **Inventory BOM Check**: `InventoryService.deduct_bom_stock()` checks recipe ingredients with row locks and logs immutable `InventoryTransaction` records.
   - If either fails, the transaction is completely rolled back.
2. **KOT Generation**:
   - Daily sequential order number generated (`ORD-YYYYMMDD-001`).
   - Daily sequential KOT generated (`KOT-001`).
   - Dispatches Celery task `execute_print_job` to connect to thermal printer on TCP port 9100.
   - Emits WebSocket event (`KOT_CREATED`) to `/ws/pos`.

### D. Billing, Deposit Credit & Settlement
1. **Running Bill (`GET /api/v1/bills/{session_id}`)**:
   - Sums order subtotals and adds 5% GST tax.
   - Deducts paid reservation advance deposit ($₹200 \times \text{guests}$).
   - If bill is less than deposit, applies configurable policy (`CUSTOMER_CREDIT`, `REFUND_REMAINDER`, `FORFEIT_REMAINDER`).
2. **Settlement (`POST /api/v1/bills/{id}/checkout`)**:
   - Records `Payment` with idempotency key.
   - Closes `DiningSession` (`status="CLOSED"`).
   - Marks `Reservation.is_deposit_credited = True`.
   - Frees physical table to `status="Available"`.

---

## 4. Test Suite Coverage
The backend includes 17 test modules:
- `test_dough_protection.py`: Verifies reservation dough quota prevents walk-in starvation, cancellations release dough idempotently, and excess orders fall back to general pool.
- `test_upi_hold_lifecycle.py`: 7-min expiration, UTR reuse blocking, and payment review states.
- `test_phase4_end_to_end.py`: Full journey from QR scan to order, BOM deduction, and checkout.
- `test_pos_security.py` & `test_auth.py`: Role-based access control (`pos:access`) and token verification.

---

## 5. Quick Commands

### Backend:
```powershell
cd backend
python -m uvicorn app.main:app --port 8000 --reload
```

### Frontend:
```powershell
cd frontend
npm install
npm run dev
```
Terminal URLs:
- Frontend: `http://localhost:3000`
- Table 2 QR terminal: `http://localhost:3000/table/qr_sec_c2a8e419f72b491295e865f12a14e9b2`
- POS Dashboard: `http://localhost:3000/pos`
- Reservations: `http://localhost:3000/book-table`
- API Docs: `http://localhost:8000/docs`
