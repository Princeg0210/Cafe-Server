"""Two different menu items with the same name never merge on the bill or in Edit Bill."""
import datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.models.branch import Branch
from app.models.kitchen import Kitchen
from app.models.menu import MenuCategory, MenuItem
from app.models.table import Table, TableQR


async def setup(db_session):
    branch = Branch(id=50, name="Same Name Branch", address="Udaipur", phone="+919351322209")
    db_session.add(branch)
    await db_session.flush()
    db_session.add(Kitchen(branch_id=branch.id, name="Main Kitchen"))
    drinks = MenuCategory(name="Beverages", display_order=1)
    bar = MenuCategory(name="Bar", display_order=2)
    db_session.add_all([drinks, bar])
    await db_session.flush()
    coke_a = MenuItem(category_id=drinks.id, name="Coke", price=Decimal("100.00"))
    coke_b = MenuItem(category_id=bar.id, name="Coke", price=Decimal("100.00"))
    table = Table(branch_id=branch.id, table_number="Table 1", capacity=4, status="Available")
    db_session.add_all([coke_a, coke_b, table])
    await db_session.flush()
    db_session.add(TableQR(table_id=table.id, qr_token="qr-same-01"))
    await db_session.commit()
    return table.id, coke_a.id, coke_b.id


async def bill_lines(db_session, client: AsyncClient, table_id: int):
    db_session.expire_all()  # tests share one DB session; real requests each get a fresh one
    res = await client.get(f"/api/v1/pos/table-sessions?target_date={datetime.date.today().isoformat()}")
    assert res.status_code == 200, res.text
    tbl = next(t for t in res.json() if t["table_id"] == table_id)
    session = next(s for s in tbl["sessions"] if s["is_active"])
    return session["session_id"], sorted((l["menu_item_id"], l["quantity"]) for l in session["items"])


@pytest.mark.asyncio
async def test_same_named_items_stay_separate(db_session, client: AsyncClient):
    table_id, a, b = await setup(db_session)
    order = lambda items: client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": items})

    assert (await order([{"menu_item_id": a, "quantity": 2}])).status_code == 201
    assert (await order([{"menu_item_id": b, "quantity": 1}])).status_code == 201
    assert (await order([{"menu_item_id": a, "quantity": 1}])).status_code == 201  # same dish again: groups

    session_id, lines = await bill_lines(db_session, client, table_id)
    assert lines == sorted([(a, 3), (b, 1)])  # two lines, not "4x Coke"

    # Edit Bill by id changes only the chosen item
    res = await client.put(f"/api/v1/pos/sessions/{session_id}/items", json={"items": [
        {"menu_item_id": a, "name": "Coke", "quantity": 1},
        {"menu_item_id": b, "name": "Coke", "quantity": 4},
    ]})
    assert res.status_code == 200, res.text
    _, lines = await bill_lines(db_session, client, table_id)
    assert lines == sorted([(a, 1), (b, 4)])

    # An old client sending only the ambiguous name is refused instead of guessing
    res = await client.put(f"/api/v1/pos/sessions/{session_id}/items", json={"items": [{"name": "Coke", "quantity": 2}]})
    assert res.status_code == 400
    assert "More than one menu item" in res.json()["detail"]


@pytest.mark.asyncio
async def test_edit_bill_by_name_ignores_stray_spaces(db_session, client: AsyncClient):
    from app.models.menu import MenuItem as MI
    table_id, a, _ = await setup(db_session)
    marinara = MI(category_id=(await db_session.get(MI, a)).category_id, name="MARINARA ", price=Decimal("400.00"))  # trailing space, as on the live menu
    db_session.add(marinara)
    await db_session.commit()
    m_id = marinara.id
    assert (await client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": [{"menu_item_id": m_id, "quantity": 1}]})).status_code == 201
    session_id, _ = await bill_lines(db_session, client, table_id)

    res = await client.put(f"/api/v1/pos/sessions/{session_id}/items", json={"items": [{"name": "MARINARA", "quantity": 3}]})
    assert res.status_code == 200, res.text
    _, lines = await bill_lines(db_session, client, table_id)
    assert lines == [(m_id, 3)]
