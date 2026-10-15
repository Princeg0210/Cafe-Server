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
