"""KOT printing from POS devices: one claim per KOT, ticket contents, printed/failed reporting."""
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.branch import Branch
from app.models.kitchen import Kitchen
from app.models.kot import KOT
from app.models.menu import MenuCategory, MenuItem
from app.models.table import Table, TableQR
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order_service import OrderService
from app.services.table_service import TableService


async def make_kot(db_session) -> KOT:
    b = Branch(id=20, name="Print Branch", address="Udaipur", phone="+919999999998")
    db_session.add(b)
    await db_session.flush()
    db_session.add(Kitchen(branch_id=b.id, name="Main Kitchen"))
    cat = MenuCategory(name="Pizza", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    pizza = MenuItem(category_id=cat.id, name="Margherita", price=Decimal("500.00"), is_active=True, is_available=True)
    table = Table(branch_id=b.id, table_number="Table 2", capacity=4, status="Available")
    db_session.add_all([pizza, table])
    await db_session.flush()
    db_session.add(TableQR(table_id=table.id, qr_token="qr-print-02"))
    await db_session.commit()

    sess = await TableService.get_or_create_dining_session(db_session, table.id)
    order = await OrderService.place_order(
        db_session,
        OrderCreate(
            qr_token="qr-print-02",
            session_token=sess.session_token,
            items=[OrderItemCreate(menu_item_id=pizza.id, quantity=2, special_instructions="no basil")],
        ),
    )
    return (await db_session.execute(select(KOT).where(KOT.order_id == order.id))).scalar_one()


@pytest.mark.asyncio
async def test_only_one_device_can_claim_a_kot(db_session, client: AsyncClient):
    kot = await make_kot(db_session)

    first = await client.post(f"/api/v1/pos/kots/{kot.id}/claim-print")
    assert first.status_code == 200
    ticket = first.json()
    assert ticket["kot_number"] == kot.kot_number
    assert ticket["table_number"] == "Table 2"
    assert ticket["items"] == [{"name": "Margherita", "quantity": 2, "special_instructions": "no basil"}]

    second = await client.post(f"/api/v1/pos/kots/{kot.id}/claim-print")
    assert second.status_code == 409  # another device is already printing it

    done = await client.post(f"/api/v1/pos/kots/{kot.id}/printed", json={"success": True})
    assert done.json()["printed_status"] == "PRINTED"
    assert (await client.post(f"/api/v1/pos/kots/{kot.id}/claim-print")).status_code == 409
    assert (await client.post(f"/api/v1/pos/kots/{kot.id}/claim-print?force=true")).status_code == 200  # Retry Print


@pytest.mark.asyncio
async def test_failed_print_can_be_claimed_again(db_session, client: AsyncClient):
    kot = await make_kot(db_session)
    await client.post(f"/api/v1/pos/kots/{kot.id}/claim-print")
    failed = await client.post(f"/api/v1/pos/kots/{kot.id}/printed", json={"success": False})
    assert failed.json()["printed_status"] == "FAILED"
    assert (await client.post(f"/api/v1/pos/kots/{kot.id}/claim-print")).status_code == 200


@pytest.mark.asyncio
async def test_claim_unknown_kot(client: AsyncClient):
    assert (await client.post("/api/v1/pos/kots/999999/claim-print")).status_code == 404
