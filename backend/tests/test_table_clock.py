"""A table's clock starts when guests start, not when someone earlier scanned the QR."""
import datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.models.branch import Branch
from app.models.menu import MenuCategory, MenuItem
from app.models.table import DiningSession, Table, TableQR
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import OrderService
from app.services.table_service import TableService
from app.utils.helpers import utc_now


async def scanned_hours_ago(db_session, qr_token: str) -> tuple[Table, DiningSession, MenuItem]:
    """A table whose QR was scanned 3 hours ago, with nobody ordering since."""
    branch = Branch(id=30, name="Clock Branch", address="Udaipur", phone="+919351322209")
    db_session.add(branch)
    await db_session.flush()
    cat = MenuCategory(name="Pizza", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    pizza = MenuItem(category_id=cat.id, name="Margherita", price=Decimal("500.00"))
    table = Table(branch_id=branch.id, table_number="Table 7", capacity=4, status="Available")
    db_session.add_all([pizza, table])
    await db_session.flush()
    db_session.add(TableQR(table_id=table.id, qr_token=qr_token))
    await db_session.commit()

    session = await TableService.get_or_create_dining_session(db_session, table.id)
    assert session.status == "OPENED"
    session.opened_at = utc_now() - datetime.timedelta(hours=3)
    await db_session.commit()
    return table, session, pizza


def started_just_now(session: DiningSession) -> bool:
    return utc_now() - session.opened_at < datetime.timedelta(minutes=1)


@pytest.mark.asyncio
async def test_first_order_restarts_clock(db_session):
    table, session, pizza = await scanned_hours_ago(db_session, "qr-clock-07")
    await OrderService.place_order(
        db_session,
        OrderCreate(qr_token="qr-clock-07", session_token=session.session_token,
                    items=[OrderItemCreate(menu_item_id=pizza.id, quantity=1)]),
    )
    await db_session.refresh(session)
    assert session.status == "ACTIVE"
    assert started_just_now(session)


@pytest.mark.asyncio
async def test_pos_walk_in_restarts_clock(db_session, client: AsyncClient):
    table, session, _ = await scanned_hours_ago(db_session, "qr-clock-08")
    res = await client.post("/api/v1/pos/walk-in/seat", json={"table_id": table.id, "guest_count": 2})
    assert res.status_code == 200
    await db_session.refresh(session)
    await db_session.refresh(table)
    assert session.status == "ACTIVE" and table.status == "Occupied"
    assert started_just_now(session)


@pytest.mark.asyncio
async def test_running_table_keeps_its_clock(db_session):
    """A second order must not reset the clock of guests who are already eating."""
    table, session, pizza = await scanned_hours_ago(db_session, "qr-clock-09")
    order = OrderCreate(qr_token="qr-clock-09", session_token=session.session_token,
                        items=[OrderItemCreate(menu_item_id=pizza.id, quantity=1)])
    await OrderService.place_order(db_session, order)
    await db_session.refresh(session)
    first_start = session.opened_at
    await OrderService.place_order(db_session, order)
    await db_session.refresh(session)
    assert session.opened_at == first_start
