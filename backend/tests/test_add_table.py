"""Admin can add a table: next number on its floor, its own working QR code."""
import pytest
from httpx import AsyncClient

from app.api.deps import get_current_user
from app.main import app
from app.utils.init_tables import ensure_default_tables


@pytest.mark.asyncio
async def test_add_table_gets_next_number_and_working_qr(db_session, client: AsyncClient):
    await ensure_default_tables(db_session)  # the original 13 tables (Balcony has Table 1 and 2), created with fixed ids

    res = await client.post("/api/v1/tables", json={"floor_number": 3, "capacity": 6})
    assert res.status_code == 201, res.text
    t = res.json()
    assert (t["table_number"], t["floor_number"], t["floor_name"], t["floor_table_num"], t["capacity"]) == (
        "Table 3", 3, "Balcony", 3, 6
    )
    assert t["qr_token"].startswith("qr_sec_")

    # Guests scanning the new table's QR land on it (not refused as "not one of the 13")
    v = await client.post("/api/v1/tables/qr/validate", json={"qr_token": t["qr_token"]})
    assert v.status_code == 200, v.text
    assert v.json()["table_id"] == t["id"]

    # The next one on the same floor is Table 4
    res2 = await client.post("/api/v1/tables", json={"floor_number": 3})
    assert res2.json()["table_number"] == "Table 4"


@pytest.mark.asyncio
async def test_add_table_validation_and_login(db_session, client: AsyncClient):
    await ensure_default_tables(db_session)
    assert (await client.post("/api/v1/tables", json={"floor_number": 9})).status_code == 422
    assert (await client.post("/api/v1/tables", json={"floor_number": 1, "capacity": 0})).status_code == 422
    app.dependency_overrides.pop(get_current_user)
    assert (await client.post("/api/v1/tables", json={"floor_number": 1})).status_code == 401


@pytest.mark.asyncio
async def test_remove_table_only_when_unused(db_session, client: AsyncClient):
    from decimal import Decimal
    from app.models.kitchen import Kitchen
    from app.models.menu import MenuCategory, MenuItem

    await ensure_default_tables(db_session)
    db_session.add(Kitchen(branch_id=1, name="Main Kitchen"))
    cat = MenuCategory(name="BEVERAGES", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    soda = MenuItem(category_id=cat.id, name="Soda", price=Decimal("100.00"))
    db_session.add(soda)
    await db_session.commit()
    soda_id = soda.id

    unused = (await client.post("/api/v1/tables", json={"floor_number": 2})).json()
    used = (await client.post("/api/v1/tables", json={"floor_number": 2})).json()
    assert (await client.post(f"/api/v1/pos/tables/{used['id']}/orders", json={"items": [{"menu_item_id": soda_id, "quantity": 1}]})).status_code == 201

    assert (await client.delete(f"/api/v1/tables/{unused['id']}")).status_code == 200
    assert (await client.delete(f"/api/v1/tables/{used['id']}")).status_code == 409  # has an order: keep its history
    assert (await client.delete("/api/v1/tables/1")).status_code == 400  # one of the original tables
    assert (await client.delete("/api/v1/tables/999999")).status_code == 404
    ids = [t["id"] for t in (await client.get("/api/v1/tables")).json()]
    assert unused["id"] not in ids and used["id"] in ids


@pytest.mark.asyncio
async def test_added_tables_and_replaced_codes_survive_restart(db_session, client: AsyncClient):
    await ensure_default_tables(db_session)
    added = (await client.post("/api/v1/tables", json={"floor_number": 1})).json()
    new_code = (await client.post("/api/v1/tables/2/qr/rotate")).json()["qr_token"]

    await ensure_default_tables(db_session)  # what the server runs on every start / deploy

    tables = {t["id"]: t for t in (await client.get("/api/v1/tables")).json()}
    assert added["id"] in tables and tables[added["id"]]["qr_token"] == added["qr_token"]
    assert tables[2]["qr_token"] == new_code  # replaced stand keeps working
