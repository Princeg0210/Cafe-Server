import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.branch import Branch
from app.models.table import Table, TableQR
from app.models.menu import MenuCategory, MenuItem
from app.models.kitchen import Kitchen, MenuItemKitchenMapping
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import OrderService


@pytest.mark.asyncio
async def test_place_order_dual_kitchen_routing(db_session: AsyncSession):
    # Create Branch, Table, QR
    branch = Branch(name="Udaipur Main", address="Old City", phone="+919988776655")
    db_session.add(branch)
    await db_session.flush()

    table = Table(branch_id=branch.id, table_number="T-01", capacity=4)
    db_session.add(table)
    await db_session.flush()

    qr = TableQR(table_id=table.id, qr_token="test-qr-token-123")
    db_session.add(qr)
    await db_session.flush()

    # Create Kitchen 1 (Food) & Kitchen 2 (Bar)
    k1 = Kitchen(branch_id=branch.id, name="Kitchen 1 - Hot Food")
    k2 = Kitchen(branch_id=branch.id, name="Kitchen 2 - Bar")
    db_session.add_all([k1, k2])
    await db_session.flush()

    # Create Menu Category & Items
    cat = MenuCategory(name="Specialties")
    db_session.add(cat)
    await db_session.flush()

    item_pizza = MenuItem(category_id=cat.id, name="Woodfired Margherita", price=Decimal("400.00"))
    item_latte = MenuItem(category_id=cat.id, name="Kerala Spiced Cappuccino", price=Decimal("220.00"))
    db_session.add_all([item_pizza, item_latte])
    await db_session.flush()

    # Map Pizza to K1, Coffee to K2
    m1 = MenuItemKitchenMapping(menu_item_id=item_pizza.id, kitchen_id=k1.id)
    m2 = MenuItemKitchenMapping(menu_item_id=item_latte.id, kitchen_id=k2.id)
    db_session.add_all([m1, m2])
    await db_session.commit()

    # Place Order with Pizza & Coffee
    order_data = OrderCreate(
        qr_token="test-qr-token-123",
        items=[
            OrderItemCreate(menu_item_id=item_pizza.id, quantity=1),
            OrderItemCreate(menu_item_id=item_latte.id, quantity=2),
        ],
    )

    order = await OrderService.place_order(db_session, order_data)

    assert order.id is not None
    assert order.status == "CONFIRMED"
    assert len(order.items) == 2
    assert len(order.kitchen_orders) == 2
