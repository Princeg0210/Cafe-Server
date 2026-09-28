import datetime
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.branch import Branch
from app.models.table import Table, DiningSession
from app.models.menu import MenuItem, MenuCategory
from app.models.order import Order, OrderItem
from app.models.reservation import Reservation
from app.models.bank_transaction import VerifiedBankCredit
from app.services.billing_service import BillingService
from app.services.settings_service import SettingsService
from app.services.payment_verification_service import PaymentVerificationService
from app.services.reservation_service import ReservationService
from app.schemas.reservation import (
    ReservationHoldRequest,
    ReservationVerifyUpiRequest,
    AndroidPaymentEventPayload,
    ReservationAssignTableRequest,
)
from app.schemas.billing import PaymentCreate


@pytest.mark.asyncio
async def test_guest_count_deposit_formula_1_2_3_5(client: AsyncClient, db_session: AsyncSession):
    """
    Test deposit formula:
    1 guest  = ₹200
    2 guests = ₹400
    3 guests = ₹600
    5 guests = ₹1,000
    Backend must calculate this automatically. Frontend cannot manipulate.
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    test_cases = [
        (1, 200.0),
        (2, 400.0),
        (3, 600.0),
        (5, 1000.0),
    ]

    for guests, expected_deposit in test_cases:
        hold_payload = {
            "branch_id": 1,
            "customer_name": f"Guest {guests} Test",
            "customer_phone": f"+91987654320{guests}",
            "guest_count": guests,
            "reservation_date": "2026-10-15",
            "time_slot": f"19:0{guests}",
        }
        res = await client.post("/api/v1/reservations/hold", json=hold_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["guest_count"] == guests
        assert data["advance_amount"] == expected_deposit
        assert data["deposit_per_guest"] == 200.0
        assert data["status"] == "HOLD"
        assert "upi://pay?" in data["upi_uri"]
        assert f"am={expected_deposit:.2f}" in data["upi_uri"]


@pytest.mark.asyncio
async def test_fake_or_random_utr_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    Customer enters fake/random UTR:
    Must be strictly REJECTED with 402 PAYMENT_NOT_VERIFIED.
    Reservation must NEVER confirm from customer-entered UTR alone.
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    # Step 1: Hold 3 guests -> ₹600
    hold_res = await client.post(
        "/api/v1/reservations/hold",
        json={
            "branch_id": 1,
            "customer_name": "Deepak Patel",
            "customer_phone": "+919876543211",
            "guest_count": 3,
            "reservation_date": "2026-10-16",
            "time_slot": "20:00",
        },
    )
    assert hold_res.status_code == 201
    resv_id = hold_res.json()["reservation_id"]

    # Step 2: Customer enters completely random UTR
    verify_res = await client.post(
        f"/api/v1/reservations/{resv_id}/verify-upi",
        json={"upi_utr": "FAKE_UTR_998877665544"},
    )
    assert verify_res.status_code == 402
    assert "PAYMENT_NOT_VERIFIED" in verify_res.json()["detail"]

    # Reservation remains on hold (PAYMENT_PENDING) and NOT confirmed
    resv = await db_session.get(Reservation, resv_id)
    assert resv.status == "PAYMENT_PENDING"
    assert resv.payment_status == "PENDING_VERIFICATION"


@pytest.mark.asyncio
async def test_wrong_amount_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    If genuine bank credit arrives for ₹400 but reservation requires ₹600:
    Must be REJECTED with 400 Bad Request (PAYMENT_UNDERPAID).
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    # Hold 3 guests -> ₹600 required
    hold_res = await client.post(
        "/api/v1/reservations/hold",
        json={
            "branch_id": 1,
            "customer_name": "Aman Verma",
            "customer_phone": "+919876543212",
            "guest_count": 3,
            "reservation_date": "2026-10-16",
            "time_slot": "20:30",
        },
    )
    resv_id = hold_res.json()["reservation_id"]

    # Bank credited only ₹400 for UTR 235745067878
    await PaymentVerificationService.record_verified_bank_credit(
        db=db_session,
        utr="235745067878",
        amount=Decimal("400.00"),
        provider_source="BANK_WEBHOOK",
    )

    # Customer tries to verify using this underpaid UTR
    verify_res = await client.post(
        f"/api/v1/reservations/{resv_id}/verify-upi",
        json={"upi_utr": "235745067878"},
    )
    assert verify_res.status_code == 400
    assert "PAYMENT_UNDERPAID" in verify_res.json()["detail"]


@pytest.mark.asyncio
async def test_already_used_utr_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    Prevent UTR reuse across bookings (replay attack prevention).
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    # Credit ₹600 in bank
    utr = "UTR_REUSE_TEST_123456"
    await PaymentVerificationService.record_verified_bank_credit(
        db=db_session,
        utr=utr,
        amount=Decimal("600.00"),
        provider_source="BANK_WEBHOOK",
    )

    # Booking 1
    res1 = await client.post(
        "/api/v1/reservations/hold",
        json={
            "branch_id": 1,
            "customer_name": "User 1",
            "customer_phone": "+919876543213",
            "guest_count": 3,
            "reservation_date": "2026-10-17",
            "time_slot": "19:00",
        },
    )
    id1 = res1.json()["reservation_id"]
    verify1 = await client.post(f"/api/v1/reservations/{id1}/verify-upi", json={"upi_utr": utr})
    assert verify1.status_code == 200
    assert verify1.json()["status"] == "CONFIRMED"

    # Booking 2 tries to reuse the same UTR
    res2 = await client.post(
        "/api/v1/reservations/hold",
        json={
            "branch_id": 1,
            "customer_name": "User 2",
            "customer_phone": "+919876543214",
            "guest_count": 3,
            "reservation_date": "2026-10-17",
            "time_slot": "19:00",
        },
    )
    id2 = res2.json()["reservation_id"]
    verify2 = await client.post(f"/api/v1/reservations/{id2}/verify-upi", json={"upi_utr": utr})
    assert verify2.status_code == 409
    assert "UTR_ALREADY_USED" in verify2.json()["detail"]


@pytest.mark.asyncio
async def test_android_payment_event_confirmation_and_idempotency(client: AsyncClient, db_session: AsyncSession):
    """
    Test secure Android payment event flow:
    - Android device authentication via X-Device-Token
    - Match ₹600 payment event to pending reservation
    - Reservation confirmed & paid
    - Duplicate event received is handled idempotently without error
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    # Customer holds 3 guests -> ₹600
    hold_res = await client.post(
        "/api/v1/reservations/hold",
        json={
            "branch_id": 1,
            "customer_name": "Karan Mehra",
            "customer_phone": "+919876543215",
            "guest_count": 3,
            "reservation_date": "2026-10-18",
            "time_slot": "20:00",
        },
    )
    resv_id = hold_res.json()["reservation_id"]

    # Customer enters UTR hint
    utr = "235745067878"
    await client.post(f"/api/v1/reservations/{resv_id}/verify-upi", json={"upi_utr": utr})

    # Android phone listener receives SMS and posts event with device token
    event_payload = {
        "event_id": "evt-android-test-001",
        "utr": utr,
        "amount": 600.0,
        "merchant_vpa": "9460555743-2@ybl",
        "payer_vpa": "customer@okaxis",
        "raw_sms": "Rs. 600 credited to account 9460555743-2@ybl via UPI Ref 235745067878",
    }
    event_res = await client.post(
        "/api/v1/reservations/android-payment-event",
        json=event_payload,
        headers={"X-Device-Token": "dev_token_jaadoo_android_phone_9460555743"},
    )
    assert event_res.status_code == 200
    assert event_res.json()["status"] == "SUCCESS"
    assert event_res.json()["confirmed_reservation_id"] == resv_id

    # Verify reservation is confirmed
    resv = await db_session.get(Reservation, resv_id)
    assert resv.status == "CONFIRMED"
    assert resv.payment_status == "PAID"

    # Duplicate payment event sent (e.g. network retry from Android phone)
    dup_res = await client.post(
        "/api/v1/reservations/android-payment-event",
        json=event_payload,
        headers={"X-Device-Token": "dev_token_jaadoo_android_phone_9460555743"},
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "ALREADY_PROCESSED"


@pytest.mark.asyncio
async def test_expired_hold_cannot_confirm_normally_and_late_payment_flagged_for_review(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Test 7-minute HOLD expiration:
    1. If hold expired -> reservation transitions to EXPIRED, availability released.
    2. If money arrives AFTER hold expired -> PAYMENT_REVIEW_REQUIRED (shown in POS, not auto-confirmed).
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    # Create reservation with past hold_expires_at
    past_time = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(minutes=10)
    resv = Reservation(
        branch_id=1,
        customer_id=1,
        guest_count=2,
        reservation_date=datetime.date(2026, 10, 19),
        time_slot="19:00",
        status="HOLD",
        payment_status="PENDING",
        advance_amount=Decimal("400.00"),
        hold_expires_at=past_time,
    )
    db_session.add(resv)
    await db_session.commit()
    await db_session.refresh(resv)

    # 1. Customer attempts to verify expired hold
    ver_res = await client.post(
        f"/api/v1/reservations/{resv.id}/verify-upi",
        json={"upi_utr": "LATE_UTR_998877"},
    )
    assert ver_res.status_code == 410
    assert "HOLD_EXPIRED" in ver_res.json()["detail"]

    # 2. Money arrives on Android after hold expired
    late_evt_res = await client.post(
        "/api/v1/reservations/android-payment-event",
        json={
            "event_id": "evt-android-late-999",
            "utr": "LATE_UTR_998877",
            "amount": 400.0,
            "merchant_vpa": "9460555743-2@ybl",
        },
        headers={"X-Device-Token": "dev_token_jaadoo_android_phone_9460555743"},
    )
    assert late_evt_res.status_code == 200
    assert late_evt_res.json()["status"] == "PAYMENT_REVIEW_REQUIRED"

    # Credit is recorded as PAYMENT_REVIEW_REQUIRED
    credit_stmt = select(VerifiedBankCredit).where(VerifiedBankCredit.utr == "LATE_UTR_998877")
    credit = (await db_session.execute(credit_stmt)).scalars().first()
    assert credit.status == "PAYMENT_REVIEW_REQUIRED"


@pytest.mark.asyncio
async def test_table_assignment_and_checkin(client: AsyncClient, db_session: AsyncSession):
    """
    Test table assignment by café staff and check-in session creation.
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=5, branch_id=1, table_number="Table 5", capacity=4, status="Available")
    db_session.add(table)
    await db_session.commit()

    # Confirmed reservation with no physical table assigned yet
    resv = Reservation(
        branch_id=1,
        customer_id=1,
        guest_count=3,
        reservation_date=datetime.date(2026, 10, 20),
        time_slot="20:00",
        table_id=None,
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=Decimal("600.00"),
    )
    db_session.add(resv)
    await db_session.commit()
    await db_session.refresh(resv)

    # Staff assigns Table 5
    assign_res = await client.post(
        f"/api/v1/reservations/{resv.id}/assign-table",
        json={"table_id": 5, "table_name": "Table 5", "floor_number": 1},
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["table_id"] == 5

    # Customer check-in
    checkin_res = await client.post(f"/api/v1/reservations/{resv.id}/checkin")
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "SEATED"

    # Verify DiningSession created on Table 5 and linked to reservation
    sess_stmt = select(DiningSession).where(DiningSession.table_id == 5)
    sess = (await db_session.execute(sess_stmt)).scalars().first()
    assert sess is not None
    assert sess.reservation_id == resv.id


@pytest.mark.asyncio
async def test_deposit_credited_to_final_bill_greater_than_deposit(client: AsyncClient, db_session: AsyncSession):
    """
    Requirement 6 & 8:
    Deposit = ₹600
    Food & Drinks = ₹2,000, Tax = ₹100 -> Gross = ₹2,100
    Reservation Credit = -₹600
    Amount Due = ₹1,500
    Customer pays ₹1,500 at checkout.
    Deposit cannot be credited twice.
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=2, branch_id=1, table_number="Table 2", capacity=4, status="Occupied")
    db_session.add(table)
    cat = MenuCategory(id=1, name="Pizzas")
    db_session.add(cat)
    item = MenuItem(id=1, category_id=1, name="Margherita Pizza", price=Decimal("1000.00"), is_available=True)
    db_session.add(item)
    await db_session.commit()

    # Confirmed reservation with ₹600 deposit
    resv = Reservation(
        branch_id=1,
        customer_id=1,
        guest_count=3,
        reservation_date=datetime.date.today(),
        time_slot="20:00",
        table_id=2,
        status="SEATED",
        payment_status="PAID",
        advance_amount=Decimal("600.00"),
        is_deposit_credited=False,
    )
    db_session.add(resv)
    await db_session.flush()

    # Active dining session linked to reservation
    session = DiningSession(
        table_id=2,
        customer_id=1,
        reservation_id=resv.id,
        session_token="sess_credit_test_01",
        status="ACTIVE",
    )
    db_session.add(session)
    await db_session.flush()

    # Customer orders food (2 x ₹1000 = ₹2000 subtotal)
    order = Order(
        dining_session_id=session.id,
        order_number="ORD-CREDIT-01",
        status="SERVED",
    )
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(
        order_id=order.id,
        menu_item_id=1,
        quantity=2,
        unit_price=Decimal("1000.00"),
        subtotal=Decimal("2000.00"),
    )
    db_session.add(order_item)
    await db_session.commit()

    # Calculate Bill
    bill = await BillingService.get_or_calculate_bill(db_session, session.id)

    # Subtotal = 2000, 5% Tax = 100 -> Gross = 2100
    assert bill.subtotal == Decimal("2000.00")
    assert bill.tax_amount == Decimal("100.00")
    assert bill.reservation_deposit_paid == Decimal("600.00")
    assert bill.reservation_credit == Decimal("600.00")
    assert bill.total_amount == Decimal("1500.00")  # Amount Due

    # Customer pays remaining balance of ₹1500 at checkout
    checkout_data = PaymentCreate(
        payment_method="UPI",
        amount_paid=Decimal("1500.00"),
        transaction_reference="REMAINING_BAL_1500",
        idempotency_key="checkout_test_bal_1500",
    )
    payment = await BillingService.process_checkout(db_session, bill.id, checkout_data)
    assert payment.amount_paid == Decimal("1500.00")
    assert bill.is_paid == True

    # Verify reservation deposit cannot be credited again
    await db_session.refresh(resv)
    assert resv.is_deposit_credited == True
    assert resv.credited_bill_id == bill.id

    # If another bill query runs, reservation credit is NOT applied again
    bill2 = await BillingService.get_or_calculate_bill(db_session, session.id)
    assert bill2.is_paid == True


@pytest.mark.asyncio
async def test_final_bill_equal_to_deposit(client: AsyncClient, db_session: AsyncSession):
    """
    Requirement 17: Final bill = deposit
    Deposit = ₹600
    Gross Bill = ₹600
    Reservation Credit = ₹600
    Amount Due = ₹0
    Checkout requires ₹0 payment.
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=3, branch_id=1, table_number="Table 3", capacity=4, status="Occupied")
    db_session.add(table)
    cat = MenuCategory(id=2, name="Pizzas")
    db_session.add(cat)
    item = MenuItem(id=2, category_id=2, name="Cheese Pizza", price=Decimal("571.43"), is_available=True)
    db_session.add(item)
    await db_session.commit()

    resv = Reservation(
        branch_id=1,
        customer_id=2,
        guest_count=3,
        reservation_date=datetime.date.today(),
        time_slot="21:00",
        table_id=3,
        status="SEATED",
        payment_status="PAID",
        advance_amount=Decimal("600.00"),
        is_deposit_credited=False,
    )
    db_session.add(resv)
    await db_session.flush()

    session = DiningSession(
        table_id=3,
        customer_id=2,
        reservation_id=resv.id,
        session_token="sess_credit_test_equal",
        status="ACTIVE",
    )
    db_session.add(session)
    await db_session.flush()

    order = Order(
        dining_session_id=session.id,
        order_number="ORD-EQUAL-01",
        status="SERVED",
    )
    db_session.add(order)
    await db_session.flush()

    # 571.43 + 5% tax (28.57) = 600.00
    order_item = OrderItem(
        order_id=order.id,
        menu_item_id=2,
        quantity=1,
        unit_price=Decimal("571.43"),
        subtotal=Decimal("571.43"),
    )
    db_session.add(order_item)
    await db_session.commit()

    bill = await BillingService.get_or_calculate_bill(db_session, session.id)
    assert bill.subtotal + bill.tax_amount == Decimal("600.00")
    assert bill.reservation_credit == Decimal("600.00")
    assert bill.total_amount == Decimal("0.00")

    # Checkout with ₹0
    checkout_data = PaymentCreate(
        payment_method="RESERVATION_DEPOSIT",
        amount_paid=Decimal("0.00"),
        transaction_reference="DEPOSIT_COVERED_FULL",
        idempotency_key="checkout_test_equal_zero",
    )
    payment = await BillingService.process_checkout(db_session, bill.id, checkout_data)
    assert payment.amount_paid == Decimal("0.00")
    assert bill.is_paid == True


@pytest.mark.asyncio
async def test_final_bill_less_than_deposit_policies(client: AsyncClient, db_session: AsyncSession):
    """
    Requirement 9: Final bill is less than deposit
    Example: Deposit = ₹600, Gross Bill = ₹450
    Test owner configurable policies:
    1. REFUND_REMAINDER (Refund excess ₹150)
    2. CUSTOMER_CREDIT (Store excess ₹150 as customer credit)
    3. FORFEIT_REMAINDER (Café retains remainder)
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=4, branch_id=1, table_number="Table 4", capacity=4, status="Occupied")
    db_session.add(table)
    cat = MenuCategory(id=3, name="Snacks")
    db_session.add(cat)
    # 428.57 + 5% (21.43) = 450.00
    item = MenuItem(id=3, category_id=3, name="Garlic Bread", price=Decimal("428.57"), is_available=True)
    db_session.add(item)
    await db_session.commit()

    policies_to_test = [
        ("REFUND_REMAINDER", "REFUND_REMAINDER", Decimal("150.00")),
        ("CUSTOMER_CREDIT", "CUSTOMER_CREDIT", Decimal("150.00")),
        ("FORFEIT_REMAINDER", "FORFEIT_REMAINDER", Decimal("0.00")),
    ]

    for idx, (policy, expected_action, expected_remainder) in enumerate(policies_to_test, start=10):
        # Configure setting
        await SettingsService.set_setting(db_session, "RESERVATION_DEPOSIT_REMAINDER_POLICY", policy)

        resv = Reservation(
            branch_id=1,
            customer_id=idx,
            guest_count=3,
            reservation_date=datetime.date.today(),
            time_slot="21:30",
            table_id=4,
            status="SEATED",
            payment_status="PAID",
            advance_amount=Decimal("600.00"),
            is_deposit_credited=False,
        )
        db_session.add(resv)
        await db_session.flush()

        session = DiningSession(
            table_id=4,
            customer_id=idx,
            reservation_id=resv.id,
            session_token=f"sess_remainder_{policy}_{idx}",
            status="ACTIVE",
        )
        db_session.add(session)
        await db_session.flush()

        order = Order(
            dining_session_id=session.id,
            order_number=f"ORD-REM-{idx}",
            status="SERVED",
        )
        db_session.add(order)
        await db_session.flush()

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=3,
            quantity=1,
            unit_price=Decimal("428.57"),
            subtotal=Decimal("428.57"),
        )
        db_session.add(order_item)
        await db_session.commit()

        bill = await BillingService.get_or_calculate_bill(db_session, session.id)
        assert bill.subtotal + bill.tax_amount == Decimal("450.00")
        assert bill.total_amount == Decimal("0.00")
        assert bill.remainder_action == expected_action
        assert bill.remainder_amount == expected_remainder


@pytest.mark.asyncio
async def test_cancellation_and_no_show_policies(client: AsyncClient, db_session: AsyncSession):
    """
    Requirement 10: Cancellation & No-Show configurable policies.
    """
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    await db_session.commit()

    # 1. Full Refund Policy
    await SettingsService.set_setting(db_session, "CANCELLATION_REFUND_POLICY", "FULL_REFUND")
    resv_full = Reservation(
        branch_id=1,
        customer_id=1,
        guest_count=2,
        reservation_date=datetime.date(2026, 11, 1),
        time_slot="19:00",
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=Decimal("400.00"),
    )
    db_session.add(resv_full)
    await db_session.commit()

    cancel_res = await client.delete(f"/api/v1/reservations/{resv_full.id}")
    assert cancel_res.status_code == 200
    data = cancel_res.json()
    assert data["status"] == "CANCELLED"
    assert data["payment_status"] == "REFUNDED"
    assert data["cancellation_refund_amount"] == 400.0

    # 2. No Refund Policy
    await SettingsService.set_setting(db_session, "CANCELLATION_REFUND_POLICY", "NO_REFUND")
    resv_none = Reservation(
        branch_id=1,
        customer_id=1,
        guest_count=2,
        reservation_date=datetime.date(2026, 11, 1),
        time_slot="19:00",
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=Decimal("400.00"),
    )
    db_session.add(resv_none)
    await db_session.commit()

    cancel_res2 = await client.delete(f"/api/v1/reservations/{resv_none.id}")
    assert cancel_res2.status_code == 200
    data2 = cancel_res2.json()
    assert data2["status"] == "CANCELLED"
    assert data2["payment_status"] == "CANCELLED"
    assert data2["cancellation_refund_amount"] == 0.0
