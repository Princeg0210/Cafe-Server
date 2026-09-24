import pytest
import asyncio
from decimal import Decimal
from sqlalchemy import select
from fastapi import HTTPException
from app.models.branch import Branch
from app.models.table import Table, TableQR, DiningSession
from app.models.menu import MenuItem, MenuCategory
from app.models.order import Order, OrderItem
from app.models.kitchen import Kitchen, MenuItemKitchenMapping, KitchenOrder
from app.models.inventory import InventoryItem, Recipe, RecipeItem
from app.models.capacity import ItemCapacityRule
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.billing import PaymentCreate
from app.services.table_service import TableService
from app.services.order_service import OrderService
from app.services.billing_service import BillingService
from app.core.config import settings


@pytest.fixture
async def setup_branch(db_session):
    b_query = select(Branch).where(Branch.id == 1)
    res = await db_session.execute(b_query)
    branch = res.scalar_one_or_none()
    if not branch:
        branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
        db_session.add(branch)
        await db_session.commit()
    return branch


@pytest.mark.asyncio
async def test_digital_menu_retrieval_and_unavailable_item(db_session, setup_branch):
    # Setup test category and menu items
    cat = MenuCategory(name="Pizza P4", display_order=1)
    db_session.add(cat)
    await db_session.flush()

    item_available = MenuItem(
        category_id=cat.id,
        name="Margherita Pizza P4",
        price=Decimal("15.00"),
        is_active=True,
        is_available=True,
    )
    item_sold_out = MenuItem(
        category_id=cat.id,
        name="Truffle Pizza P4",
        price=Decimal("25.00"),
        is_active=True,
        is_available=False,  # Sold out / Unavailable
    )
    db_session.add_all([item_available, item_sold_out])
    await db_session.commit()

    # Create table & QR
    table = Table(branch_id=1, table_number="T-P4-01", capacity=4, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-p4-menu-test")
    db_session.add(qr)
    await db_session.commit()

    # Retrieve valid session
    session = await TableService.get_or_create_dining_session(db_session, table.id)
    assert session.status == "OPENED"

    # Attempt to order unavailable item -> expect 404/MENU_ITEM_NOT_FOUND
    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[OrderItemCreate(menu_item_id=item_sold_out.id, quantity=1)]
    )
    with pytest.raises(HTTPException) as exc_info:
        await OrderService.place_order(db_session, order_data)
    assert exc_info.value.status_code == 404
    assert "MENU_ITEM_NOT_FOUND" in exc_info.value.detail


@pytest.mark.asyncio
async def test_valid_cart_order_creation_and_recalculated_totals(db_session, setup_branch):
    cat = MenuCategory(name="Pasta P4", display_order=2)
    db_session.add(cat)
    await db_session.flush()

    pasta = MenuItem(
        category_id=cat.id,
        name="Penne Arrabbiata P4",
        price=Decimal("12.50"),
        is_active=True,
        is_available=True,
    )
    db_session.add(pasta)
    await db_session.commit()

    table = Table(branch_id=1, table_number="T-P4-02", capacity=2, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-p4-cart-test")
    db_session.add(qr)
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)

    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[OrderItemCreate(menu_item_id=pasta.id, quantity=2)]
    )

    order = await OrderService.place_order(db_session, order_data)
    assert order.status == "CONFIRMED"
    assert len(order.items) == 1
    assert order.items[0].unit_price == Decimal("12.50")
    assert order.items[0].subtotal == Decimal("25.00")

    # Check running bill calculation
    bill = await BillingService.get_or_calculate_bill(db_session, session.id)
    assert bill.subtotal == Decimal("25.00")
    tax_rate = Decimal(str(getattr(settings, "DEFAULT_TAX_RATE", "0.05")))
    expected_tax = (Decimal("25.00") * tax_rate).quantize(Decimal("0.01"))
    assert bill.tax_amount == expected_tax
    assert bill.total_amount == Decimal("25.00") + expected_tax


@pytest.mark.asyncio
async def test_production_capacity_server_side_enforcement(db_session, setup_branch):
    cat = MenuCategory(name="Pizza Cap P4", display_order=3)
    db_session.add(cat)
    await db_session.flush()

    pizza = MenuItem(
        category_id=cat.id,
        name="Cap Pizza P4",
        price=Decimal("18.00"),
        is_active=True,
        is_available=True,
    )
    db_session.add(pizza)
    await db_session.flush()

    # Set strict capacity limit of 2 units via ItemCapacityRule
    cap_rule = ItemCapacityRule(
        menu_item_id=pizza.id,
        max_production_limit=2,
        allocated_count=0,
        is_active=True,
    )
    db_session.add(cap_rule)
    await db_session.commit()

    table = Table(branch_id=1, table_number="T-P4-03", capacity=4, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-p4-cap-test")
    db_session.add(qr)
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)

    # Order 3 units -> should fail due to capacity limit 2
    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[OrderItemCreate(menu_item_id=pizza.id, quantity=3)]
    )
    with pytest.raises(HTTPException) as exc_info:
        await OrderService.place_order(db_session, order_data)
    assert exc_info.value.status_code == 400
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail


@pytest.mark.asyncio
async def test_inventory_bom_failure_rolls_back_order(db_session, setup_branch):
    cat = MenuCategory(name="Beverage P4", display_order=4)
    db_session.add(cat)
    await db_session.flush()

    coffee = MenuItem(
        category_id=cat.id,
        name="Espresso Special P4",
        price=Decimal("4.00"),
        is_active=True,
        is_available=True,
    )
    db_session.add(coffee)
    await db_session.flush()

    # Ingredient with low stock (10g)
    beans = InventoryItem(
        sku="SKU-BEANS-P4",
        name="Coffee Beans P4",
        unit_of_measure="g",
        current_stock=Decimal("10.00"),
        reorder_threshold=Decimal("5.00"),
    )
    db_session.add(beans)
    await db_session.flush()

    # Recipe & RecipeItem requires 20g per coffee
    recipe = Recipe(menu_item_id=coffee.id, name="Espresso Recipe P4")
    db_session.add(recipe)
    await db_session.flush()

    recipe_item = RecipeItem(
        recipe_id=recipe.id,
        inventory_item_id=beans.id,
        quantity_required=Decimal("20.00"),
    )
    db_session.add(recipe_item)
    await db_session.commit()

    table = Table(branch_id=1, table_number="T-P4-04", capacity=2, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-p4-bom-test")
    db_session.add(qr)
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)
    session_id = session.id
    session_token = session.session_token

    # Order 1 coffee -> requires 20g beans, but stock is 10g -> expect INSUFFICIENT_STOCK
    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session_token,
        items=[OrderItemCreate(menu_item_id=coffee.id, quantity=1)]
    )
    with pytest.raises(HTTPException) as exc_info:
        await OrderService.place_order(db_session, order_data)
    assert exc_info.value.status_code == 400
    assert "INSUFFICIENT_STOCK" in exc_info.value.detail

    # Verify no order created under this session_id
    orders_res = await db_session.execute(
        select(Order).where(Order.dining_session_id == session_id)
    )
    assert len(orders_res.scalars().all()) == 0


@pytest.mark.asyncio
async def test_item_level_kitchen_routing_dual_kitchens(db_session, setup_branch):
    cat = MenuCategory(name="Mains & Drinks P4", display_order=5)
    db_session.add(cat)
    await db_session.flush()

    pizza = MenuItem(category_id=cat.id, name="Route Pizza P4", price=Decimal("14.00"), is_active=True, is_available=True)
    drink = MenuItem(category_id=cat.id, name="Route Soda P4", price=Decimal("3.00"), is_active=True, is_available=True)
    db_session.add_all([pizza, drink])
    await db_session.flush()

    # Setup Kitchen 1 and Kitchen 2
    k1 = Kitchen(branch_id=1, name="Hot Kitchen P4")
    k2 = Kitchen(branch_id=1, name="Bar Station P4")
    db_session.add_all([k1, k2])
    await db_session.flush()

    map1 = MenuItemKitchenMapping(menu_item_id=pizza.id, kitchen_id=k1.id)
    map2 = MenuItemKitchenMapping(menu_item_id=drink.id, kitchen_id=k2.id)
    db_session.add_all([map1, map2])
    await db_session.commit()

    table = Table(branch_id=1, table_number="T-P4-05", capacity=4, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-p4-route-test")
    db_session.add(qr)
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)

    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[
            OrderItemCreate(menu_item_id=pizza.id, quantity=1),
            OrderItemCreate(menu_item_id=drink.id, quantity=2),
        ]
    )

    order = await OrderService.place_order(db_session, order_data)

    # Verify 2 Kitchen Orders created under 1 Order ID
    k_orders_res = await db_session.execute(
        select(KitchenOrder).where(KitchenOrder.order_id == order.id)
    )
    k_orders = k_orders_res.scalars().all()
    assert len(k_orders) == 2
    kitchen_ids = {ko.kitchen_id for ko in k_orders}
    assert kitchen_ids == {k1.id, k2.id}


@pytest.mark.asyncio
async def test_pos_payment_idempotency_and_session_closure(db_session, setup_branch):
    cat = MenuCategory(name="POS Test P4", display_order=6)
    db_session.add(cat)
    await db_session.flush()

    dish = MenuItem(category_id=cat.id, name="POS Risotto P4", price=Decimal("20.00"), is_active=True, is_available=True)
    db_session.add(dish)
    await db_session.commit()

    table = Table(branch_id=1, table_number="T-P4-06", capacity=2, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-p4-pos-test")
    db_session.add(qr)
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)

    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[OrderItemCreate(menu_item_id=dish.id, quantity=1)]
    )
    await OrderService.place_order(db_session, order_data)

    bill = await BillingService.get_or_calculate_bill(db_session, session.id)

    # 1. Test insufficient payment
    pay_bad = PaymentCreate(
        payment_method="CASH",
        amount_paid=Decimal("10.00"),  # Less than bill.total_amount (~21.00)
        idempotency_key="idem-key-p4-bad",
    )
    with pytest.raises(HTTPException) as exc_info:
        await BillingService.process_checkout(db_session, bill.id, pay_bad)
    assert exc_info.value.status_code == 400
    assert "INSUFFICIENT_PAYMENT" in exc_info.value.detail

    # 2. Process valid payment with idempotency key
    pay_good = PaymentCreate(
        payment_method="CARD",
        amount_paid=bill.total_amount,
        idempotency_key="idem-key-p4-1001",
    )
    payment1 = await BillingService.process_checkout(db_session, bill.id, pay_good)
    assert payment1.id is not None

    # 3. Test duplicate payment with same idempotency key -> idempotent return
    payment2 = await BillingService.process_checkout(db_session, bill.id, pay_good)
    assert payment2.id == payment1.id

    # 4. Verify session is CLOSED & table is Available
    await db_session.refresh(session)
    assert session.status == "CLOSED"
    await db_session.refresh(table)
    assert table.status == "Available"

    # 5. Verify closed session rejects new order attempts
    order_data_closed = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[OrderItemCreate(menu_item_id=dish.id, quantity=1)]
    )
    with pytest.raises(HTTPException) as exc_info_closed:
        await OrderService.place_order(db_session, order_data_closed)
    assert exc_info_closed.value.status_code == 400
    assert "CLOSED_DINING_SESSION" in exc_info_closed.value.detail


@pytest.mark.asyncio
async def test_himalayan_rosehip_mint_tisane_order_matches_exact_item_and_price(db_session, setup_branch):
    """Verify ordering Himalayan Rosehip & Mint Tisane resolves exact item and price 150 (not Cannelloni 500)."""
    cat_pasta = MenuCategory(name="Pasta Specialty", display_order=10)
    cat_hot = MenuCategory(name="Hot Drinks Specialty", display_order=11)
    db_session.add_all([cat_pasta, cat_hot])
    await db_session.flush()

    cannelloni = MenuItem(
        category_id=cat_pasta.id,
        name="CANNELLONI (CHEESE & TOMATO)",
        price=Decimal("500.00"),
        is_active=True,
        is_available=True,
    )
    rosehip = MenuItem(
        category_id=cat_hot.id,
        name="HIMALAYAN ROSEHIP & MINT TISANE",
        price=Decimal("150.00"),
        is_active=True,
        is_available=True,
    )
    db_session.add_all([cannelloni, rosehip])
    await db_session.commit()

    table = Table(branch_id=1, table_number="T-RH-01", capacity=2, status="Available")
    db_session.add(table)
    await db_session.flush()
    qr = TableQR(table_id=table.id, qr_token="qr-rosehip-test-token")
    db_session.add(qr)
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)

    # 1. Order placed with name and mapped id
    order_data = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[
            OrderItemCreate(
                name="HIMALAYAN ROSEHIP & MINT TISANE",
                menu_item_id=rosehip.id,
                quantity=2,
            )
        ]
    )
    order = await OrderService.place_order(db_session, order_data)
    assert order.items[0].menu_item_id == rosehip.id
    assert order.items[0].unit_price == Decimal("150.00")
    assert order.items[0].subtotal == Decimal("300.00")

    # 2. Even if menu_item_id was passed as Cannelloni id by mistake, name takes precedence
    order_data_name_override = OrderCreate(
        qr_token=qr.qr_token,
        session_token=session.session_token,
        items=[
            OrderItemCreate(
                name="HIMALAYAN ROSEHIP & MINT TISANE",
                menu_item_id=cannelloni.id,  # Wrong ID!
                quantity=1,
            )
        ]
    )
    order2 = await OrderService.place_order(db_session, order_data_name_override)
    assert order2.items[0].menu_item_id == rosehip.id
    assert order2.items[0].unit_price == Decimal("150.00")
    assert order2.items[0].subtotal == Decimal("150.00")
