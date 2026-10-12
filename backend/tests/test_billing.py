import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.branch import Branch
from app.models.table import Table, DiningSession
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem
from app.schemas.billing import PaymentCreate
from app.services.billing_service import BillingService


@pytest.mark.asyncio
async def test_bill_calculation_and_idempotent_checkout(db_session: AsyncSession):
    # Setup Branch, Table, Dining Session
    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-02", capacity=4)
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-test-99", status="ACTIVE")
    db_session.add(session)
    await db_session.flush()

    # Create Order with 2 line items
    cat = MenuCategory(name="Main")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Pasta", price=Decimal("300.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-101", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(
        order_id=order.id,
        menu_item_id=item.id,
        quantity=2,
        unit_price=Decimal("300.00"),
        subtotal=Decimal("600.00"),
    )
    db_session.add(order_item)
    await db_session.commit()

    # Get calculated bill
    bill = await BillingService.get_or_calculate_bill(db_session, session.id)
    assert bill.subtotal == Decimal("600.00")
    assert bill.tax_amount == Decimal("30.00")  # 5% tax on 600
    assert bill.total_amount == Decimal("630.00")
    assert bill.is_paid is False

    # Process POS checkout with idempotency key
    pay_data = PaymentCreate(
        payment_method="UPI",
        amount_paid=Decimal("630.00"),
        transaction_reference="UPI-123456",
        idempotency_key="idempotent-key-001",
    )

    payment1 = await BillingService.process_checkout(db_session, bill.id, pay_data)
    assert payment1.id is not None
    assert payment1.amount_paid == Decimal("630.00")

    # Duplicate checkout with SAME idempotency key must return exact same payment object
    payment2 = await BillingService.process_checkout(db_session, bill.id, pay_data)
    assert payment2.id == payment1.id


@pytest.mark.asyncio
async def test_insufficient_payment_rejected(db_session: AsyncSession):
    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-03", capacity=4)
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-test-100", status="ACTIVE")
    db_session.add(session)
    await db_session.flush()

    cat = MenuCategory(name="Main Pizza")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Large Truffle Pizza", price=Decimal("1000.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-102", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(order_id=order.id, menu_item_id=item.id, quantity=1, unit_price=Decimal("1000.00"), subtotal=Decimal("1000.00"))
    db_session.add(order_item)
    await db_session.commit()

    bill = await BillingService.get_or_calculate_bill(db_session, session.id)
    assert bill.total_amount == Decimal("1050.00")

    # Paying 500.00 on 1050.00 bill must be rejected
    from fastapi import HTTPException
    bad_pay_data = PaymentCreate(payment_method="CASH", amount_paid=Decimal("500.00"), idempotency_key="bad-pay-key-01")
    with pytest.raises(HTTPException) as exc_info:
        await BillingService.process_checkout(db_session, bill.id, bad_pay_data)

    assert exc_info.value.status_code == 400
    assert "INSUFFICIENT_PAYMENT" in exc_info.value.detail


@pytest.mark.asyncio
async def test_gst_5_percent_and_discount_percent_end_to_end(db_session: AsyncSession):
    """End-to-end test: 10% discount deducted before 5% GST, accurate net due, and checkout."""
    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-04", capacity=4)
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-test-gst-1", status="ACTIVE")
    db_session.add(session)
    await db_session.flush()

    cat = MenuCategory(name="Pizzas")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Woodfire Margherita", price=Decimal("500.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-GST-1", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    # 4 items * 500 = Subtotal 2000.00
    order_item = OrderItem(
        order_id=order.id,
        menu_item_id=item.id,
        quantity=4,
        unit_price=Decimal("500.00"),
        subtotal=Decimal("2000.00"),
    )
    db_session.add(order_item)
    await db_session.commit()

    # Initial bill without discount
    bill = await BillingService.get_or_calculate_bill(db_session, session.id)
    assert bill.subtotal == Decimal("2000.00")
    assert bill.discount_amount == Decimal("0.00")
    assert bill.tax_amount == Decimal("100.00")  # 5% of 2000 = 100.00
    assert bill.total_amount == Decimal("2100.00")

    # Apply 10% discount (allowed maximum)
    bill_disc = await BillingService.set_session_discount(
        db_session,
        dining_session_id=session.id,
        discount_type="PERCENT",
        discount_value=Decimal("10"),
        reason="Owner VIP Discount",
        user_id=1,
    )
    # Subtotal: 2000.00
    # Discount: 200.00 (10% of 2000)
    # Taxable Value: 1800.00
    # 5% GST on Taxable Value: 90.00 (2.5% CGST = 45.00, 2.5% SGST = 45.00)
    # Net Due: 1800.00 + 90.00 = 1890.00
    assert bill_disc.subtotal == Decimal("2000.00")
    assert bill_disc.discount_amount == Decimal("200.00")
    assert bill_disc.discount_type == "PERCENT"
    assert bill_disc.tax_amount == Decimal("90.00")
    assert bill_disc.total_amount == Decimal("1890.00")

    # Process POS checkout with exact net amount
    checkout = await BillingService.process_checkout(
        db_session,
        bill_disc.id,
        PaymentCreate(
            payment_method="UPI",
            amount_paid=Decimal("1890.00"),
            transaction_reference="UPI-GST-SUCCESS-01",
            idempotency_key="pay-key-gst-1",
        ),
    )
    assert checkout.id is not None
    assert checkout.amount_paid == Decimal("1890.00")

    # Dining session should be closed and table Available
    await db_session.refresh(session)
    await db_session.refresh(table)
    assert session.status == "CLOSED"
    assert table.status == "Available"


@pytest.mark.asyncio
async def test_gst_and_flat_discount_end_to_end(db_session: AsyncSession):
    """End-to-end test: FLAT rupee discount, 5% GST computation on post-discount value."""
    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-05", capacity=2)
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-test-flat-1", status="ACTIVE")
    db_session.add(session)
    await db_session.flush()

    cat = MenuCategory(name="Beverages")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Artisan Coffee", price=Decimal("250.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-FLAT-1", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    # 6 items * 250 = Subtotal 1500.00
    order_item = OrderItem(
        order_id=order.id,
        menu_item_id=item.id,
        quantity=6,
        unit_price=Decimal("250.00"),
        subtotal=Decimal("1500.00"),
    )
    db_session.add(order_item)
    await db_session.commit()

    # Apply Flat discount ₹150.00 (exactly 10% of 1500, the cap)
    bill = await BillingService.set_session_discount(
        db_session,
        dining_session_id=session.id,
        discount_type="FLAT",
        discount_value=Decimal("150.00"),
        reason="Manager Courtesy",
        user_id=1,
    )

    # Subtotal: 1500.00
    # Discount: 150.00
    # Taxable Value: 1350.00
    # 5% GST: 1350.00 * 0.05 = 67.50
    # Net Due: 1350.00 + 67.50 = 1417.50
    assert bill.subtotal == Decimal("1500.00")
    assert bill.discount_amount == Decimal("150.00")
    assert bill.tax_amount == Decimal("67.50")
    assert bill.total_amount == Decimal("1417.50")


@pytest.mark.asyncio
async def test_discount_10_percent_cap_enforcement(db_session: AsyncSession):
    """Enforce strict 10% discount cap: reject >10% for both PERCENT and FLAT types."""
    from fastapi import HTTPException

    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-06", capacity=4)
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-test-cap-1", status="ACTIVE")
    db_session.add(session)
    await db_session.flush()

    cat = MenuCategory(name="Desserts")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Tiramisu", price=Decimal("1000.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-CAP-1", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(order_id=order.id, menu_item_id=item.id, quantity=1, unit_price=Decimal("1000.00"), subtotal=Decimal("1000.00"))
    db_session.add(order_item)
    await db_session.commit()

    # 1. Reject > 10% PERCENT discount
    with pytest.raises(HTTPException) as exc_p:
        await BillingService.set_session_discount(
            db_session,
            dining_session_id=session.id,
            discount_type="PERCENT",
            discount_value=Decimal("15"),
            reason="Illegal 15% discount",
            user_id=1,
        )
    assert exc_p.value.status_code == 400
    assert "DISCOUNT_LIMIT" in exc_p.value.detail

    # 2. Reject > 10% FLAT discount (on 1000 subtotal, max flat is 100)
    with pytest.raises(HTTPException) as exc_f:
        await BillingService.set_session_discount(
            db_session,
            dining_session_id=session.id,
            discount_type="FLAT",
            discount_value=Decimal("150.00"),
            reason="Illegal 150 flat discount",
            user_id=1,
        )
    assert exc_f.value.status_code == 400
    assert "DISCOUNT_LIMIT" in exc_f.value.detail

    # 3. Successful 5% discount (under cap)
    bill_valid = await BillingService.set_session_discount(
        db_session,
        dining_session_id=session.id,
        discount_type="PERCENT",
        discount_value=Decimal("5"),
        reason="Valid 5% discount",
        user_id=1,
    )
    # Subtotal 1000, 5% disc = 50, taxable = 950, 5% GST = 47.50, Net = 997.50
    assert bill_valid.discount_amount == Decimal("50.00")
    assert bill_valid.tax_amount == Decimal("47.50")
    assert bill_valid.total_amount == Decimal("997.50")


@pytest.mark.asyncio
async def test_discount_locked_when_bill_settled(db_session: AsyncSession):
    """Discount cannot be altered once dining session is closed or paid."""
    from fastapi import HTTPException

    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-07", capacity=4)
    db_session.add(table)
    await db_session.flush()

    session = DiningSession(table_id=table.id, session_token="sess-test-lock-1", status="ACTIVE")
    db_session.add(session)
    await db_session.flush()

    cat = MenuCategory(name="Drinks")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Iced Tea", price=Decimal("200.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-LOCK-1", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(order_id=order.id, menu_item_id=item.id, quantity=1, unit_price=Decimal("200.00"), subtotal=Decimal("200.00"))
    db_session.add(order_item)
    await db_session.commit()

    bill = await BillingService.get_or_calculate_bill(db_session, session.id)

    # Checkout & close session
    await BillingService.process_checkout(
        db_session,
        bill.id,
        PaymentCreate(
            payment_method="CASH",
            amount_paid=bill.total_amount,
            idempotency_key="lock-test-pay-1",
        ),
    )

    # Attempting to apply or change discount on closed session must raise DISCOUNT_LOCKED
    with pytest.raises(HTTPException) as exc_locked:
        await BillingService.set_session_discount(
            db_session,
            dining_session_id=session.id,
            discount_type="PERCENT",
            discount_value=Decimal("10"),
            reason="Post-settlement discount attempt",
            user_id=1,
        )
    assert exc_locked.value.status_code == 400
    assert "DISCOUNT_LOCKED" in exc_locked.value.detail


@pytest.mark.asyncio
async def test_advance_deposit_credit_with_gst_and_discount(db_session: AsyncSession):
    """Advance reservation deposit credit applied against gross total (after 5% GST and discount)."""
    from app.models.customer import Customer
    from app.models.reservation import Reservation
    import datetime

    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    cust = Customer(name="Aman Sharma", phone="+919351322209")
    db_session.add(cust)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-08", capacity=6)
    db_session.add(table)
    await db_session.flush()

    # Reservation with ₹500 advance deposit paid
    res = Reservation(
        branch_id=branch.id,
        customer_id=cust.id,
        table_id=table.id,
        table_name="Table 8",
        floor_number=1,
        guest_count=4,
        reservation_date=datetime.date.today(),
        time_slot="19:00-20:00",
        status="SEATED",
        payment_status="PAID",
        advance_amount=Decimal("500.00"),
        is_deposit_credited=False,
    )
    db_session.add(res)
    await db_session.flush()

    session = DiningSession(
        table_id=table.id,
        customer_id=cust.id,
        reservation_id=res.id,
        session_token="sess-test-deposit-1",
        status="ACTIVE",
    )
    db_session.add(session)
    await db_session.flush()

    cat = MenuCategory(name="Main Course")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Sourdough Pizza", price=Decimal("1000.00"))
    db_session.add(item)
    await db_session.flush()

    order = Order(dining_session_id=session.id, order_number="ORD-TEST-DEP-1", status="CONFIRMED")
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(order_id=order.id, menu_item_id=item.id, quantity=1, unit_price=Decimal("1000.00"), subtotal=Decimal("1000.00"))
    db_session.add(order_item)
    await db_session.commit()

    # Apply 10% discount
    bill = await BillingService.set_session_discount(
        db_session,
        dining_session_id=session.id,
        discount_type="PERCENT",
        discount_value=Decimal("10"),
        reason="Corporate Privilege",
        user_id=1,
    )

    # Subtotal: 1000.00
    # Discount: 100.00 (10%)
    # Taxable Value: 900.00
    # 5% GST: 45.00
    # Gross Total: 945.00
    # Advance Deposit Paid: 500.00
    # Reservation Credit Applied: 500.00
    # Net Amount Due: 945.00 - 500.00 = 445.00
    assert bill.subtotal == Decimal("1000.00")
    assert bill.discount_amount == Decimal("100.00")
    assert bill.tax_amount == Decimal("45.00")
    assert bill.reservation_deposit_paid == Decimal("500.00")
    assert bill.reservation_credit == Decimal("500.00")
    assert bill.total_amount == Decimal("445.00")

    # Complete Checkout for net due ₹445.00
    checkout = await BillingService.process_checkout(
        db_session,
        bill.id,
        PaymentCreate(
            payment_method="CARD",
            amount_paid=Decimal("445.00"),
            transaction_reference="CARD-TXN-001",
            idempotency_key="deposit-checkout-01",
        ),
    )
    assert checkout.id is not None
    assert checkout.amount_paid == Decimal("445.00")

    # Verify reservation is marked COMPLETED and deposit credited permanently
    await db_session.refresh(res)
    assert res.is_deposit_credited is True
    assert res.status == "COMPLETED"
    assert res.credited_bill_id == bill.id
