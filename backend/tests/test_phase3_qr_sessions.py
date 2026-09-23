import pytest
import secrets
from sqlalchemy import select
from app.models.branch import Branch
from app.models.table import Table, TableQR, DiningSession
from app.models.menu import MenuItem, MenuCategory
from app.services.table_service import TableService


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
async def test_qr_token_rotation(client, db_session, setup_branch):
    table = Table(branch_id=1, table_number="T-01", capacity=4, status="Available")
    db_session.add(table)
    await db_session.commit()

    # Initial QR token rotation
    qr1 = await TableService.rotate_qr_token(db_session, table.id)
    token1 = qr1.qr_token
    assert qr1.is_active is True

    # Validate initial token
    val1 = await client.post("/api/v1/tables/qr/validate", json={"qr_token": token1})
    assert val1.status_code == 200

    # Rotate QR token again
    qr2 = await TableService.rotate_qr_token(db_session, table.id)
    token2 = qr2.qr_token
    assert qr2.is_active is True
    assert token1 != token2

    # Validate old token - MUST FAIL with 400 INVALID_QR_TOKEN
    val_old = await client.post("/api/v1/tables/qr/validate", json={"qr_token": token1})
    assert val_old.status_code == 400
    assert "INVALID_QR_TOKEN" in val_old.json()["detail"]

    # Validate new token - MUST SUCCEED
    val_new = await client.post("/api/v1/tables/qr/validate", json={"qr_token": token2})
    assert val_new.status_code == 200


@pytest.mark.asyncio
async def test_qr_token_validation_success_and_failure(client, db_session, setup_branch):
    table = Table(branch_id=1, table_number="T-02", capacity=2, status="Available")
    db_session.add(table)
    await db_session.commit()

    qr = await TableService.rotate_qr_token(db_session, table.id)

    # Validate active token
    res_valid = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["is_valid"] is True
    assert data["table_id"] == table.id
    assert data["session_status"] == "OPENED"

    # Validate invalid/rotated token
    res_invalid = await client.post("/api/v1/tables/qr/validate", json={"qr_token": "qr_sec_invalid_token_123"})
    assert res_invalid.status_code == 400
    assert "INVALID_QR_TOKEN" in res_invalid.json()["detail"]


@pytest.mark.asyncio
async def test_dining_session_decoupled_from_qr_scan(client, db_session, setup_branch):
    table = Table(branch_id=1, table_number="T-03", capacity=6, status="Available")
    db_session.add(table)
    await db_session.commit()

    qr = await TableService.rotate_qr_token(db_session, table.id)

    # QR scan creates OPENED session
    res = await client.post("/api/v1/tables/qr/session", json={"qr_token": qr.qr_token})
    assert res.status_code == 200
    session_data = res.json()
    assert session_data["status"] == "OPENED"

    # Table status must STILL be Available (scans do not auto-occupy)
    tbl = await db_session.get(Table, table.id)
    assert tbl.status == "Available"


@pytest.mark.asyncio
async def test_dining_session_concurrency_single_active_session(db_session, setup_branch):
    table = Table(branch_id=1, table_number="T-04", capacity=4, status="Available")
    db_session.add(table)
    await db_session.commit()

    # Call get_or_create_dining_session twice
    sess1 = await TableService.get_or_create_dining_session(db_session, table.id)
    sess2 = await TableService.get_or_create_dining_session(db_session, table.id)

    assert sess1.id == sess2.id
    assert sess1.session_token == sess2.session_token


@pytest.mark.asyncio
async def test_closed_session_protection(client, db_session, setup_branch):
    table = Table(branch_id=1, table_number="T-05", capacity=4, status="Available")
    db_session.add(table)
    await db_session.commit()

    qr = await TableService.rotate_qr_token(db_session, table.id)
    session = await TableService.get_or_create_dining_session(db_session, table.id)

    # Close session
    await TableService.close_dining_session(db_session, session.id)

    # Create menu category and item (MenuCategory does not take description)
    cat = MenuCategory(name="Pizzas")
    db_session.add(cat)
    await db_session.flush()

    menu_item = MenuItem(
        category_id=cat.id,
        name="Test Pizza",
        description="Tasty pizza",
        price=500.0,
        is_available=True,
    )

    db_session.add(menu_item)
    await db_session.commit()

    # Attempt placing order on closed session
    order_payload = {
        "qr_token": qr.qr_token,
        "session_token": session.session_token,
        "items": [{"menu_item_id": menu_item.id, "quantity": 1}],
    }
    res = await client.post("/api/v1/orders", json=order_payload)
    assert res.status_code == 400
    assert "CLOSED_DINING_SESSION" in res.json()["detail"]

