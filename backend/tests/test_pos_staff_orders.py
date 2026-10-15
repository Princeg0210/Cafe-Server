"""POS staff take orders for a table: same running bill and KOT as a guest's QR order."""
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.api.deps import get_current_user
from app.main import app
from app.models.branch import Branch
from app.models.kitchen import Kitchen
from app.models.kot import KOT
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order
from app.models.table import DiningSession, Table, TableQR


async def setup_table(db_session, qr_active: bool = True):
    branch = Branch(id=40, name="POS Branch", address="Udaipur", phone="+919351322209")
    db_session.add(branch)
    await db_session.flush()
    db_session.add(Kitchen(branch_id=branch.id, name="Main Kitchen"))
    cat = MenuCategory(name="Pizza", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    pizza = MenuItem(category_id=cat.id, name="Margherita", price=Decimal("500.00"), is_active=True, is_available=True)
    soda = MenuItem(category_id=cat.id, name="Lime Soda", price=Decimal("150.00"), is_active=True, is_available=True)
    table = Table(branch_id=branch.id, table_number="Table 4", capacity=4, status="Available")
    db_session.add_all([pizza, soda, table])
    await db_session.flush()
    db_session.add(TableQR(table_id=table.id, qr_token="qr-pos-04", is_active=qr_active))
    await db_session.commit()
    return table, pizza, soda


def order(client: AsyncClient, table_id: int, items, allergy=None):
    return client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": items, "allergy_info": allergy})


@pytest.mark.asyncio
async def test_staff_order_opens_table_and_sends_kot(db_session, client: AsyncClient):
    table, pizza, soda = await setup_table(db_session)

    res = await order(client, table.id, [{"menu_item_id": pizza.id, "quantity": 2, "special_instructions": "well done"}], "No nuts")
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "CONFIRMED"
    assert body["allergy_info"] == "No nuts"

    await db_session.refresh(table)
    assert table.status == "Occupied"
    session = (await db_session.execute(select(DiningSession).where(DiningSession.table_id == table.id))).scalar_one()
    assert session.status == "ACTIVE"
    kot = (await db_session.execute(select(KOT).where(KOT.order_id == body["id"]))).scalar_one()
    assert kot.printed_status == "PENDING"  # the kitchen printer picks it up

    # A second round goes onto the same running bill, with its own KOT
    res2 = await order(client, table.id, [{"menu_item_id": soda.id, "quantity": 1}])
    assert res2.status_code == 201
    assert res2.json()["dining_session_id"] == session.id
    kots = (await db_session.execute(select(func.count(KOT.id)).join(Order).where(Order.dining_session_id == session.id))).scalar()
    assert kots == 2


@pytest.mark.asyncio
async def test_staff_order_works_when_table_qr_is_switched_off(db_session, client: AsyncClient):
    table, pizza, _ = await setup_table(db_session, qr_active=False)
    res = await order(client, table.id, [{"menu_item_id": pizza.id, "quantity": 1}])
    assert res.status_code == 201, res.text


@pytest.mark.asyncio
async def test_staff_order_rejects_bad_input(db_session, client: AsyncClient):
    table, pizza, _ = await setup_table(db_session)
    table_id, pizza_id = table.id, pizza.id  # a failed request rolls back the shared test session
    assert (await order(client, 999999, [{"menu_item_id": pizza_id, "quantity": 1}])).status_code == 404
    assert (await order(client, table_id, [])).status_code == 422
    assert (await order(client, table_id, [{"menu_item_id": pizza_id, "quantity": 0}])).status_code == 422
    assert (await order(client, table_id, [{"menu_item_id": pizza_id, "quantity": 51}])).status_code == 422


@pytest.mark.asyncio
async def test_staff_order_needs_login(db_session, client: AsyncClient):
    table, pizza, _ = await setup_table(db_session)
    app.dependency_overrides.pop(get_current_user)
    assert (await order(client, table.id, [{"menu_item_id": pizza.id, "quantity": 1}])).status_code == 401
