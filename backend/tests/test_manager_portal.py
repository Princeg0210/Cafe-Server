import pytest
import datetime
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status

from app.models.billing import Bill, Payment
from app.models.bank_transaction import VerifiedBankCredit
from app.models.supplier import Supplier, PurchaseOrder
from app.models.table import DiningSession, Table
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.reservation import Reservation
from app.models.user import User, Role
from app.api.deps import get_current_user
from app.main import app


@pytest.mark.asyncio
async def test_manager_overview_empty_database(client: AsyncClient):
    """Ensure overview returns valid, decimal-safe defaults without exceptions on an empty database."""
    res = await client.get("/api/v1/manager/overview")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "period" in data
    assert "revenue" in data
    assert data["revenue"]["gross_sales"] == "0.00"
    assert data["revenue"]["net_sales"] == "0.00"
    assert data["revenue"]["discounts"] == "0.00"
    assert data["revenue"]["completed_bills_count"] == 0
    assert data["petty_cash"]["is_configured"] is False
    assert data["profit_and_loss"]["is_provisional"] is True


@pytest.mark.asyncio
async def test_manager_petty_cash_endpoint(client: AsyncClient):
    """Ensure petty cash endpoint honestly reports that ledger is not configured."""
    res = await client.get("/api/v1/manager/petty-cash")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["is_configured"] is False
    assert data["status"] == "NOT_CONFIGURED"
    assert data["opening_balance"] is None
    assert "proposed_schema" in data


@pytest.mark.asyncio
async def test_manager_role_forbidden_for_unauthorized_user(db_session: AsyncSession):
    """Ensure users without Manager or Admin roles receive 403 Forbidden."""
    async def override_waiter_user():
        return User(id=99, username="waiter_1", email="waiter@example.com", is_active=True, role=Role(id=9, name="Waiter"))

    from httpx import AsyncClient, ASGITransport
    app.dependency_overrides[get_current_user] = override_waiter_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/manager/overview")
        assert res.status_code == status.HTTP_403_FORBIDDEN
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_financial_calculations_with_paid_bills_and_upi(db_session: AsyncSession, client: AsyncClient):
    """
    Test Decimal-safe calculations:
    - Paid bills: subtotal, discount, tax, total.
    - Payments: UPI vs Cash.
    - VerifiedBankCredit: only SETTLED credits counted in settled UPI.
    - PurchaseOrder: only RECEIVED PO counted in incurred expenses.
    """
    today = datetime.date.today()

    # 1. Create branch, table & dining session
    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-01", capacity=4, status="Occupied")
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-mgr-99", status="CLOSED")
    db_session.add(session)
    await db_session.flush()

    # 2. Create paid bill
    bill = Bill(
        dining_session_id=session.id,
        subtotal=Decimal("1000.00"),
        tax_amount=Decimal("50.00"),
        discount_amount=Decimal("100.00"),
        reservation_deposit_paid=Decimal("0.00"),
        reservation_credit=Decimal("0.00"),
        total_amount=Decimal("950.00"),
        is_paid=True,
    )
    db_session.add(bill)
    await db_session.flush()

    # 3. Create payments (UPI 500, CASH 450)
    pay_upi = Payment(
        bill_id=bill.id,
        payment_method="UPI",
        amount_paid=Decimal("500.00"),
        transaction_reference="UPI-UTR-9999",
    )
    pay_cash = Payment(
        bill_id=bill.id,
        payment_method="CASH",
        amount_paid=Decimal("450.00"),
    )
    db_session.add_all([pay_upi, pay_cash])

    # 4. Create VerifiedBankCredit for UPI-UTR-9999 as SETTLED
    vbc = VerifiedBankCredit(
        utr="UPI-UTR-9999",
        amount=Decimal("500.00"),
        merchant_vpa="jaadoo@icici",
        status="SETTLED",
        provider_source="BANK_WEBHOOK",
    )
    # Another unverified / review-required credit
    vbc_review = VerifiedBankCredit(
        utr="UPI-UTR-0000",
        amount=Decimal("200.00"),
        merchant_vpa="jaadoo@icici",
        status="PAYMENT_REVIEW_REQUIRED",
        provider_source="ANDROID_LISTENER",
    )
    db_session.add_all([vbc, vbc_review])

    # 5. Create Supplier & PurchaseOrders (one RECEIVED, one ORDERED)
    supplier = Supplier(name="Organic Farms Udaipur", email="contact@farms.in")
    db_session.add(supplier)
    await db_session.flush()

    po_received = PurchaseOrder(
        supplier_id=supplier.id,
        status="RECEIVED",
        total_cost=Decimal("350.00"),
        invoice_date=today,
    )
    po_ordered = PurchaseOrder(
        supplier_id=supplier.id,
        status="ORDERED",
        total_cost=Decimal("500.00"),
        invoice_date=today,
    )
    db_session.add_all([po_received, po_ordered])
    await db_session.commit()

    # Now query /api/v1/manager/overview
    res = await client.get(f"/api/v1/manager/overview?start={today}&end={today}")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    # Check Gross & Net Sales
    assert data["revenue"]["gross_sales"] == "1000.00"
    assert data["revenue"]["discounts"] == "100.00"
    assert data["revenue"]["taxes"] == "50.00"
    assert data["revenue"]["net_sales"] == "950.00"
    assert data["revenue"]["completed_bills_count"] == 1
    assert data["revenue"]["aov"] == "950.00"

    # Check Collections
    assert data["collections"]["net_collections"] == "950.00"
    assert data["collections"]["by_method"]["UPI"] == "500.00"
    assert data["collections"]["by_method"]["CASH"] == "450.00"

    # Check UPI Reconciliation: SETTLED is 500.00, review is 200.00
    assert data["upi_reconciliation"]["verified_settled_amount"] == "500.00"
    assert data["upi_reconciliation"]["verified_settled_count"] == 1
    assert data["upi_reconciliation"]["review_required_amount"] == "200.00"
    assert data["upi_reconciliation"]["review_required_count"] == 1

    # Check Expenses: only RECEIVED is 350.00, ORDERED is 500.00
    assert data["expenses"]["received_expenses"] == "350.00"
    assert data["expenses"]["ordered_commitments"] == "500.00"

    # Check Provisional Profit: Net Sales (950) - Received Expenses (350) = 600.00
    assert data["profit_and_loss"]["provisional_surplus"] == "600.00"
    assert data["profit_and_loss"]["is_provisional"] is True


@pytest.mark.asyncio
async def test_manager_payments_ledger_endpoint(client: AsyncClient):
    """Ensure payments ledger returns items with verification metadata and proper pagination."""
    res = await client.get("/api/v1/manager/payments?page=1&page_size=20")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "items" in data
    assert "total_count" in data
    assert "page" in data
    assert "filtered_total_amount" in data


@pytest.mark.asyncio
async def test_clarified_sales_deposit_and_checkout_balance(db_session: AsyncSession, client: AsyncClient):
    """
    Test Clarified Sales Metrics:
    - Eligible dining consumption: ₹1,200 (subtotal 1200, discount 0, tax 0)
    - Reservation deposit credited: ₹500
    - Remaining POS checkout balance: ₹700 (Bill.total_amount)
    - Paid at checkout: ₹700 (CASH)
    - Confirmed Reservation deposit: ₹500

    Verifies:
    1. Gross sales / Gross subtotal = 1200.00
    2. Total dining consumption = 1200.00
    3. Net sales = 1200.00 (NOT ₹700!)
    4. Reservation credits applied = 500.00
    5. Net POS checkout due = 700.00
    6. Net checkout collections = 700.00
    7. Advance deposits collected = 500.00
    8. Total funds collected = 1200.00
    """
    target_date = datetime.date(2026, 6, 15)
    tx_utc = datetime.datetime(2026, 6, 15, 6, 30, 0)

    branch = Branch(name="Udaipur Lakeview", address="Pichola", phone="+919988776600")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-99", capacity=4, status="Occupied")
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-clarify-1200", status="CLOSED")
    db_session.add(session)
    await db_session.flush()

    bill = Bill(
        dining_session_id=session.id,
        subtotal=Decimal("1200.00"),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        reservation_deposit_paid=Decimal("500.00"),
        reservation_credit=Decimal("500.00"),
        total_amount=Decimal("700.00"),
        is_paid=True,
        created_at=tx_utc,
    )
    db_session.add(bill)
    await db_session.flush()

    pay = Payment(
        bill_id=bill.id,
        payment_method="CASH",
        amount_paid=Decimal("700.00"),
        created_at=tx_utc,
    )
    db_session.add(pay)

    customer = Customer(
        name="Rahul Verma",
        phone="+919351322209",
        email="rahul@example.com",
    )
    db_session.add(customer)
    await db_session.flush()

    resv = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        table_id=table.id,
        reservation_date=target_date,
        time_slot="19:00 - 21:00",
        guest_count=2,
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=Decimal("500.00"),
        created_at=tx_utc,
    )
    db_session.add(resv)
    await db_session.commit()

    res = await client.get(f"/api/v1/manager/overview?start={target_date}&end={target_date}")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    rev = data["revenue"]
    assert rev["gross_subtotal"] == "1200.00"
    assert rev["discounts"] == "0.00"
    assert rev["taxes"] == "0.00"
    assert rev["total_dining_consumption"] == "1200.00"
    assert rev["net_sales"] == "1200.00", "Net dining sales must reflect full ₹1,200 consumption, not ₹700 checkout balance"
    assert rev["reservation_credits_applied"] == "500.00"
    assert rev["net_pos_checkout_due"] == "700.00"

    cols = data["collections"]
    assert cols["net_checkout_collections"] == "700.00"
    assert cols["advance_deposits_collected"] == "500.00"
    assert cols["total_funds_collected"] == "1200.00"


@pytest.mark.asyncio
async def test_ist_date_range_filtering_boundaries(db_session: AsyncSession, client: AsyncClient):
    """
    Test half-open UTC timestamp boundaries [start_utc, end_exclusive_utc)
    for calendar dates in Asia/Kolkata (IST = UTC + 5:30):

    Target IST date: 2026-07-10
    IST start of day: 2026-07-10 00:00:00 IST -> 2026-07-09 18:30:00 UTC
    IST end of day:   2026-07-10 23:59:59 IST -> 2026-07-10 18:29:59 UTC
    IST next day start (exclusive boundary): 2026-07-11 00:00:00 IST -> 2026-07-10 18:30:00 UTC

    Test boundary points:
    1. Before boundary: 2026-07-09 18:29:59 UTC (11:59:59 PM IST July 9) -> EXCLUDED
    2. Midnight IST start: 2026-07-09 18:30:00 UTC (12:00:00 AM IST July 10) -> INCLUDED
    3. Early morning IST: 2026-07-09 23:59:59 UTC (05:29:59 AM IST July 10) -> INCLUDED
    4. 5:30 AM IST (UTC midnight): 2026-07-10 00:00:00 UTC (05:30:00 AM IST July 10) -> INCLUDED
    5. Late night IST: 2026-07-10 18:29:59 UTC (11:59:59 PM IST July 10) -> INCLUDED
    6. Exclusive end boundary: 2026-07-10 18:30:00 UTC (12:00:00 AM IST July 11) -> EXCLUDED from July 10
    """
    d_ist = datetime.date(2026, 7, 10)

    branch = Branch(name="Udaipur East", address="Pratap Nagar", phone="+919988776611")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-BOUND", capacity=4, status="Occupied")
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-boundary", status="CLOSED")
    db_session.add(session)
    await db_session.flush()

    test_timestamps = [
        (datetime.datetime(2026, 7, 9, 18, 29, 59), False, "before_start"),
        (datetime.datetime(2026, 7, 9, 18, 30, 0), True, "midnight_start"),
        (datetime.datetime(2026, 7, 9, 23, 59, 59), True, "early_morning_529"),
        (datetime.datetime(2026, 7, 10, 0, 0, 0), True, "utc_midnight_530"),
        (datetime.datetime(2026, 7, 10, 18, 29, 59), True, "late_night_1159"),
        (datetime.datetime(2026, 7, 10, 18, 30, 0), False, "exclusive_end"),
    ]

    for utc_dt, _, _ in test_timestamps:
        bill = Bill(
            dining_session_id=session.id,
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            reservation_deposit_paid=Decimal("0.00"),
            reservation_credit=Decimal("0.00"),
            total_amount=Decimal("100.00"),
            is_paid=True,
            created_at=utc_dt,
        )
        db_session.add(bill)
    await db_session.commit()

    # Single IST day query
    res = await client.get(f"/api/v1/manager/overview?start={d_ist}&end={d_ist}")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    assert data["revenue"]["completed_bills_count"] == 4
    assert data["revenue"]["total_dining_consumption"] == "400.00"

    # Multi-day query: start=2026-07-10, end=2026-07-11
    d_ist_next = datetime.date(2026, 7, 11)
    res_multi = await client.get(f"/api/v1/manager/overview?start={d_ist}&end={d_ist_next}")
    assert res_multi.status_code == status.HTTP_200_OK
    data_multi = res_multi.json()
    assert data_multi["revenue"]["completed_bills_count"] == 5
    assert data_multi["revenue"]["total_dining_consumption"] == "500.00"


@pytest.mark.asyncio
async def test_reservation_staff_verify_payment_endpoint(db_session: AsyncSession, client: AsyncClient):
    """
    Test Reservation Advance Payment Staff Verification:
    - Endpoint: POST /api/v1/reservations/{id}/staff-verify-payment
    - Validates request payload schema: requires JSON {"upi_utr": "..."}
    - Rejects invalid / empty payload or UTR shorter than 4 characters with 422.
    - Successfully verifies valid UTR and records settlement.
    """
    branch = Branch(name="Udaipur West", address="Fateh Sagar", phone="+919988776622")
    db_session.add(branch)
    await db_session.flush()

    customer = Customer(
        name="Sunil Sharma",
        phone="+919876543299",
        email="sunil@example.com",
    )
    db_session.add(customer)
    await db_session.flush()

    resv = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        reservation_date=datetime.date.today(),
        time_slot="20:00 - 22:00",
        guest_count=4,
        status="HOLD",
        payment_status="PENDING",
        advance_amount=Decimal("500.00"),
        hold_expires_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(minutes=15),
    )
    db_session.add(resv)
    await db_session.commit()

    # 1. Invalid payload: empty JSON body -> 422 Unprocessable Entity
    res_invalid_empty = await client.post(f"/api/v1/reservations/{resv.id}/staff-verify-payment", json={})
    assert res_invalid_empty.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 2. Invalid payload: UTR too short (< 4 chars) -> 422 Unprocessable Entity
    res_invalid_short = await client.post(f"/api/v1/reservations/{resv.id}/staff-verify-payment", json={"upi_utr": "123"})
    assert res_invalid_short.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 3. Valid payload: 12-digit UTR -> 200 OK
    res_valid = await client.post(
        f"/api/v1/reservations/{resv.id}/staff-verify-payment",
        json={"upi_utr": "426819283741"},
    )
    assert res_valid.status_code == status.HTTP_200_OK
    res_data = res_valid.json()
    assert res_data["status"] == "CONFIRMED"
    assert res_data["payment_status"] == "PAID"
    assert res_data["upi_utr"] == "426819283741"

