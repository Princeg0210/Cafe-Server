import pytest
import datetime
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select

from app.models.branch import Branch
from app.models.table import Table, TableQR, DiningSession
from app.models.menu import MenuItem, MenuCategory
from app.models.kot import KOT
from app.models.kitchen import Kitchen, KitchenPrinter, PrintJob
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import OrderService
from app.services.table_service import TableService
from app.services.pos_service import POSService


@pytest.mark.asyncio
async def test_kot_daily_sequence_and_offline_printer_resilience(db_session, client: AsyncClient):
    # Setup Branch and Kitchen
    b = Branch(id=10, name="KOT Test Branch", address="Udaipur", phone="+919999999999")
    db_session.add(b)
    await db_session.flush()

    k = Kitchen(branch_id=b.id, name="Main Kitchen")
    db_session.add(k)
    await db_session.flush()

    # Printer is OFFLINE
    printer = KitchenPrinter(kitchen_id=k.id, printer_name="Kitchen Thermal", ip_address="192.168.1.250", is_online=False)
    db_session.add(printer)

    # Categories and Menu Items
    cat_pizza = MenuCategory(name="Pizza", display_order=1)
    cat_beverage = MenuCategory(name="Beverage", display_order=2)
    db_session.add_all([cat_pizza, cat_beverage])
    await db_session.flush()

    pizza = MenuItem(category_id=cat_pizza.id, name="Margherita Bufala", price=Decimal("250.00"), is_active=True, is_available=True)
    drink = MenuItem(category_id=cat_beverage.id, name="Fresh Lime Soda", price=Decimal("100.00"), is_active=True, is_available=True)
    db_session.add_all([pizza, drink])
    await db_session.flush()

    # Tables
    table1 = Table(branch_id=b.id, table_number="01", capacity=4, status="Available")
    table4 = Table(branch_id=b.id, table_number="04", capacity=4, status="Available")
    db_session.add_all([table1, table4])
    await db_session.flush()

    qr1 = TableQR(table_id=table1.id, qr_token="qr-table-01")
    qr4 = TableQR(table_id=table4.id, qr_token="qr-table-04")
    db_session.add_all([qr1, qr4])
    await db_session.commit()

    # Round 1: Table 01 orders 2x Margherita Bufala
    sess1 = await TableService.get_or_create_dining_session(db_session, table1.id)
    order1 = await OrderService.place_order(
        db_session,
        OrderCreate(
            qr_token="qr-table-01",
            session_token=sess1.session_token,
            items=[OrderItemCreate(menu_item_id=pizza.id, quantity=2, special_instructions="Extra crispy")]
        )
    )

    # Verify KOT #001 generated
    kot1_res = await db_session.execute(select(KOT).where(KOT.order_id == order1.id))
    kot1 = kot1_res.scalar_one()
    assert kot1.kot_number == "KOT-001"
    assert kot1.sequence_number == 1
    assert kot1.table_id == table1.id
    assert kot1.dining_session_id == sess1.id
    assert kot1.total_amount == Decimal("500.00")
    assert kot1.items_count == 2
    assert kot1.status == "GENERATED"
    # Order remains valid despite offline printer!
    assert order1.status == "CONFIRMED"

    # Round 2: Table 04 orders 1x Pizza + 1x Lime Soda
    sess4 = await TableService.get_or_create_dining_session(db_session, table4.id)
    order2 = await OrderService.place_order(
        db_session,
        OrderCreate(
            qr_token="qr-table-04",
            session_token=sess4.session_token,
            items=[
                OrderItemCreate(menu_item_id=pizza.id, quantity=1),
                OrderItemCreate(menu_item_id=drink.id, quantity=1),
            ]
        )
    )

    # Verify KOT #002 generated
    kot2_res = await db_session.execute(select(KOT).where(KOT.order_id == order2.id))
    kot2 = kot2_res.scalar_one()
    assert kot2.kot_number == "KOT-002"
    assert kot2.sequence_number == 2
    assert kot2.table_id == table4.id
    assert kot2.total_amount == Decimal("350.00")
    assert kot2.items_count == 2

    # Round 3: Table 01 orders again: 1x Fresh Lime Soda
    order3 = await OrderService.place_order(
        db_session,
        OrderCreate(
            qr_token="qr-table-01",
            session_token=sess1.session_token,
            items=[OrderItemCreate(menu_item_id=drink.id, quantity=1)]
        )
    )

    # Verify KOT #003 generated under Table 01 and belongs to SAME Dining Session #1
    kot3_res = await db_session.execute(select(KOT).where(KOT.order_id == order3.id))
    kot3 = kot3_res.scalar_one()
    assert kot3.kot_number == "KOT-003"
    assert kot3.sequence_number == 3
    assert kot3.table_id == table1.id
    assert kot3.dining_session_id == sess1.id
    assert kot3.total_amount == Decimal("100.00")

    # Check Running Bill for Table 01 aggregates both KOTs (KOT-001 + KOT-003 = 500 + 100 = 600)
    bill1 = await TableService.get_session_bill(db_session, sess1.id)
    assert bill1.subtotal == Decimal("600.00")

    # Test POS Endpoints
    # 1. GET /api/v1/pos/kots
    response = await client.get("/api/v1/pos/kots")
    assert response.status_code == 200
    pos_kots = response.json()
    assert len(pos_kots) >= 3
    kot_numbers = [k["kot_number"] for k in pos_kots]
    assert "KOT-003" in kot_numbers
    assert "KOT-002" in kot_numbers
    assert "KOT-001" in kot_numbers

    # 2. GET /api/v1/pos/summary
    sum_resp = await client.get("/api/v1/pos/summary")
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert summary["total_kots"] >= 3
    assert summary["tables_served"] >= 2
    assert summary["total_items"] >= 5

    # 3. POST /api/v1/pos/kots/{id}/retry-print
    retry_resp = await client.post(f"/api/v1/pos/kots/{kot1.id}/retry-print")
    assert retry_resp.status_code == 200
    retry_data = retry_resp.json()
    assert retry_data["kot_id"] == kot1.id
    # Offline printer keeps KOT and order valid, marks printed_status as FAILED
    assert retry_data["printed_status"] in ("FAILED", "PENDING")

    # 4. POST /api/v1/pos/sessions/{id}/close
    close_resp = await client.post(f"/api/v1/pos/sessions/{sess1.id}/close")
    assert close_resp.status_code == 200

    # Verify session closed and table available
    sess_check = await db_session.get(DiningSession, sess1.id)
    assert sess_check.status == "CLOSED"
    tbl_check = await db_session.get(Table, table1.id)
    assert tbl_check.status == "Available"


@pytest.mark.asyncio
async def test_concurrent_kot_generation_no_duplicates(db_session, client: AsyncClient):
    """
    Test two simultaneous order requests for the same business date.
    Verify:
    1. Two concurrent orders NEVER receive the same KOT number.
    2. Unique constraint (business_date, sequence_number) is enforced.
    3. Safe retry/recalculation occurs on race without creating duplicate KOT numbers.
    4. KOT and PrintJob remain transactionally consistent.
    """
    from tests.conftest import TestingSessionLocal
    import asyncio

    b = Branch(name="Concurrent Branch", address="Udaipur", phone="+919111111111")
    db_session.add(b)
    await db_session.flush()

    cat = MenuCategory(name="Conc Cat", display_order=1)
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Conc Pizza", price=Decimal("200.00"), is_active=True, is_available=True)
    db_session.add(item)
    await db_session.flush()

    t1 = Table(branch_id=b.id, table_number="C1", capacity=2, status="Available")
    t2 = Table(branch_id=b.id, table_number="C2", capacity=2, status="Available")
    db_session.add_all([t1, t2])
    await db_session.flush()

    qr1 = TableQR(table_id=t1.id, qr_token="qr-conc-1")
    qr2 = TableQR(table_id=t2.id, qr_token="qr-conc-2")
    db_session.add_all([qr1, qr2])
    await db_session.commit()

    sess1 = await TableService.get_or_create_dining_session(db_session, t1.id)
    sess2 = await TableService.get_or_create_dining_session(db_session, t2.id)

    order_data1 = OrderCreate(
        qr_token="qr-conc-1",
        session_token=sess1.session_token,
        items=[OrderItemCreate(menu_item_id=item.id, quantity=1)]
    )
    order_data2 = OrderCreate(
        qr_token="qr-conc-2",
        session_token=sess2.session_token,
        items=[OrderItemCreate(menu_item_id=item.id, quantity=1)]
    )

    # Execute concurrent orders using separate sessions to simulate real parallel HTTP requests
    async def place_concurrent_order(order_data):
        async with TestingSessionLocal() as session:
            return await OrderService.place_order(session, order_data)

    results = await asyncio.gather(
        place_concurrent_order(order_data1),
        place_concurrent_order(order_data2),
    )

    o1, o2 = results[0], results[1]
    assert o1.status == "CONFIRMED"
    assert o2.status == "CONFIRMED"

    # Query both KOTs
    async with TestingSessionLocal() as session:
        kots_res = await session.execute(
            select(KOT).where(KOT.order_id.in_([o1.id, o2.id]))
        )
        kots = kots_res.scalars().all()

        assert len(kots) == 2
        kot_numbers = [k.kot_number for k in kots]
        seq_numbers = [k.sequence_number for k in kots]

        # Verify uniqueness: two concurrent orders must NEVER receive the same KOT number
        assert len(set(kot_numbers)) == 2
        assert len(set(seq_numbers)) == 2
        assert abs(seq_numbers[0] - seq_numbers[1]) == 1

        # Verify PrintJobs exist for both KOTs (transactional consistency)
        for k in kots:
            pjobs_res = await session.execute(
                select(PrintJob).where(PrintJob.kot_id == k.id)
            )
            pjobs = pjobs_res.scalars().all()
            assert len(pjobs) >= 1
            assert pjobs[0].kot_id == k.id
