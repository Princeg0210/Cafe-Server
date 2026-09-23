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
