"""Pizzas print on their own KOT; everything else goes on a second KOT."""
import datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.branch import Branch
from app.models.kitchen import Kitchen
from app.models.kot import KOT
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem
from app.models.table import Table, TableQR


async def setup(db_session):
    branch = Branch(id=60, name="Split Branch", address="Udaipur", phone="+919351322209")
    db_session.add(branch)
    await db_session.flush()
    db_session.add(Kitchen(branch_id=branch.id, name="Main Kitchen"))
    pizza_cat = MenuCategory(name="PIZZA", display_order=1)
    drink_cat = MenuCategory(name="BEVERAGES", display_order=2)
    starter_cat = MenuCategory(name="STARTERS", display_order=3)
    db_session.add_all([pizza_cat, drink_cat, starter_cat])
    await db_session.flush()
    marg = MenuItem(category_id=pizza_cat.id, name="Margherita", price=Decimal("500.00"))
    marinara = MenuItem(category_id=pizza_cat.id, name="Marinara", price=Decimal("400.00"))
    soda = MenuItem(category_id=drink_cat.id, name="Lime Soda", price=Decimal("100.00"))
    focaccia = MenuItem(category_id=starter_cat.id, name="Focaccia", price=Decimal("300.00"))
    table = Table(branch_id=branch.id, table_number="Table 1", capacity=4, status="Available")
    db_session.add_all([marg, marinara, soda, focaccia, table])
    await db_session.flush()
    db_session.add(TableQR(table_id=table.id, qr_token="qr-split-01"))
    await db_session.commit()
    return table.id, marg.id, marinara.id, soda.id, focaccia.id


async def kot_items(db_session):
    db_session.expire_all()
    kots = (
        await db_session.execute(
            select(KOT).options(selectinload(KOT.order).selectinload(Order.items).selectinload(OrderItem.menu_item)).order_by(KOT.id)
        )
    ).scalars().all()
    return [(k.dining_session_id, sorted(f"{oi.quantity}x {oi.menu_item.name}" for oi in k.order.items)) for k in kots]


@pytest.mark.asyncio
async def test_mixed_order_prints_pizza_and_other_kots(db_session, client: AsyncClient):
    table_id, marg, marinara, soda, focaccia = await setup(db_session)
    res = await client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": [
        {"menu_item_id": soda, "quantity": 2},
        {"menu_item_id": marg, "quantity": 1},
        {"menu_item_id": focaccia, "quantity": 1},
        {"menu_item_id": marinara, "quantity": 2},
    ]})
    assert res.status_code == 201, res.text

    kots = await kot_items(db_session)
    assert [items for _, items in kots] == [
        ["1x Margherita", "2x Marinara"],  # pizza KOT first
        ["1x Focaccia", "2x Lime Soda"],
    ]
    assert kots[0][0] == kots[1][0]  # same table bill


@pytest.mark.asyncio
async def test_single_kind_order_stays_one_kot(db_session, client: AsyncClient):
    table_id, marg, marinara, soda, _ = await setup(db_session)
    assert (await client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": [
        {"menu_item_id": marg, "quantity": 1}, {"menu_item_id": marinara, "quantity": 1}]})).status_code == 201
    assert (await client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": [
        {"menu_item_id": soda, "quantity": 3}]})).status_code == 201
    kots = await kot_items(db_session)
    assert [items for _, items in kots] == [["1x Margherita", "1x Marinara"], ["3x Lime Soda"]]
