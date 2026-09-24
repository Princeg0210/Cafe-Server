import pytest
import datetime
from unittest.mock import patch
from app.models.branch import Branch
from app.models.table import Table, DiningSession
from app.models.customer import Customer
from app.models.reservation import Reservation
from app.models.menu import MenuItem, MenuCategory
from app.services.table_service import TableService
from app.utils.helpers import IST


@pytest.fixture
async def setup_cafe_environment(db_session):
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)

    table1 = Table(id=1, branch_id=1, table_number="Table 1", capacity=4, status="Available")
    table2 = Table(id=2, branch_id=1, table_number="Table 2", capacity=4, status="Available")
    db_session.add_all([table1, table2])

    category = MenuCategory(id=1, name="Starters", display_order=1)
    db_session.add(category)
    await db_session.flush()

    item = MenuItem(
        id=1,
        category_id=1,
        name="Truffle Garlic Bread",
        description="Freshly baked",
        price=350.0,
        is_available=True,
    )
    db_session.add(item)
    await db_session.commit()
    return {"branch": branch, "table1": table1, "table2": table2, "item": item}


@pytest.mark.asyncio
async def test_time_window_smart_filter(client, db_session, setup_cafe_environment):
    """
    1. Time-Window Smart Filter:
    If Table 1 is reserved for 8:00 PM Dinner, a walk-in guest scanning at 1:00 PM Lunch
    is NOT alarmed with a "TABLE RESERVED" notice. Outside the 60-90 min window,
    the table acts as completely available for walk-ins.
    """
    table = setup_cafe_environment["table1"]
    qr = await TableService.rotate_qr_token(db_session, table.id)

    today = datetime.date.today()
    cust = Customer(name="Prince Dinner", phone="+919876543299")
    db_session.add(cust)
    await db_session.flush()

    resv = Reservation(
        branch_id=1,
        customer_id=cust.id,
        guest_count=2,
        reservation_date=today,
        time_slot="20:00",
        table_id=table.id,
        table_name=table.table_number,
        status="CONFIRMED",
    )
    db_session.add(resv)
    await db_session.commit()

    # Simulate Lunch time: 13:00 (1:00 PM) on the same day
    lunch_now = datetime.datetime.combine(today, datetime.time(13, 0), tzinfo=IST)
    with patch("app.utils.helpers.ist_now", return_value=lunch_now):
        res = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
        assert res.status_code == 200
        data = res.json()
        # Outside 90-min window -> acts as available, no reserved notice
        assert data["is_reserved"] is False
        assert data["reservation"] is None


@pytest.mark.asyncio
async def test_grace_period_auto_release(client, db_session, setup_cafe_environment):
    """
    2. 15-Minute Grace Period & Auto-Release (No-Show Protection):
    If a reservation is 16+ minutes late and still CONFIRMED, scanning the table
    automatically transitions it to NO_SHOW and frees up the table for walk-ins.
    """
    table = setup_cafe_environment["table1"]
    qr = await TableService.rotate_qr_token(db_session, table.id)

    today = datetime.date.today()
    cust = Customer(name="Late Guest", phone="+919876543298")
    db_session.add(cust)
    await db_session.flush()

    resv = Reservation(
        branch_id=1,
        customer_id=cust.id,
        guest_count=2,
        reservation_date=today,
        time_slot="19:30",
        table_id=table.id,
        table_name=table.table_number,
        status="CONFIRMED",
    )
    db_session.add(resv)
    await db_session.commit()

    # Simulate current time: 19:46 (16 minutes past booking)
    late_now = datetime.datetime.combine(today, datetime.time(19, 46), tzinfo=IST)
    with patch("app.utils.helpers.ist_now", return_value=late_now):
        res = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
        assert res.status_code == 200
        data = res.json()
        # Auto-released to NO_SHOW, table is free for walk-in!
        assert data["is_reserved"] is False
        assert data["reservation"] is None

    # Verify reservation status in DB changed to NO_SHOW
    await db_session.refresh(resv)
    assert resv.status == "NO_SHOW"


@pytest.mark.asyncio
async def test_quick_dine_mode_for_walk_in(client, db_session, setup_cafe_environment):
    """
    4. Quick Dine Mode for Walk-Ins:
    If Table 1 is reserved in 60 minutes, the walk-in receives a Quick Dine notice
    (under 45 minutes) so they can enjoy a quick meal without turning them away.
    """
    table = setup_cafe_environment["table1"]
    qr = await TableService.rotate_qr_token(db_session, table.id)

    today = datetime.date.today()
    cust = Customer(name="Upcoming Guest", phone="+919876543297")
    db_session.add(cust)
    await db_session.flush()

    resv = Reservation(
        branch_id=1,
        customer_id=cust.id,
        guest_count=2,
        reservation_date=today,
        time_slot="20:00",
        table_id=table.id,
        table_name=table.table_number,
        status="CONFIRMED",
    )
    db_session.add(resv)
    await db_session.commit()

    # Simulate 19:00 (exactly 60 minutes before 20:00 reservation)
    scan_now = datetime.datetime.combine(today, datetime.time(19, 0), tzinfo=IST)
    with patch("app.utils.helpers.ist_now", return_value=scan_now):
        res = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
        assert res.status_code == 200
        data = res.json()
        assert data["is_reserved"] is True
        notice = data["reservation"]
        assert notice is not None
        assert notice["can_quick_dine"] is True
        assert notice["quick_dine_minutes"] == 45
        assert notice["minutes_until_reservation"] == 60
        assert notice["allow_self_checkin"] is True


@pytest.mark.asyncio
async def test_one_tap_self_checkin(client, db_session, setup_cafe_environment):
    """
    3. 1-Tap Self Check-In via QR Scan:
    When the customer arrives, tapping the check-in button transitions the reservation
    to SEATED and links their customer account to the active dining session.
    """
    table = setup_cafe_environment["table1"]
    qr = await TableService.rotate_qr_token(db_session, table.id)

    # Validate to get active session
    val_res = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
    session_token = val_res.json()["session_token"]

    cust = Customer(name="Prince Gupta", phone="+919876543296")
    db_session.add(cust)
    await db_session.flush()

    resv = Reservation(
        branch_id=1,
        customer_id=cust.id,
        guest_count=2,
        reservation_date=datetime.date.today(),
        time_slot="19:30",
        table_id=table.id,
        table_name=table.table_number,
        status="CONFIRMED",
    )
    db_session.add(resv)
    await db_session.commit()

    # Self check-in via 1-tap endpoint
    checkin_res = await client.post(
        f"/api/v1/reservations/{resv.id}/checkin",
        json={"session_token": session_token, "table_id": table.id},
    )
    assert checkin_res.status_code == 200
    checkin_data = checkin_res.json()
    assert checkin_data["status"] == "SEATED"

    # Verify DiningSession is linked to customer and set to ACTIVE
    await db_session.refresh(resv)
    assert resv.status == "SEATED"

    sess_res = await client.get(
        f"/api/v1/tables/sessions/{val_res.json()['session_id']}/bill",
        headers={"X-Session-Token": session_token},
    )
    assert sess_res.status_code == 200


@pytest.mark.asyncio
async def test_multi_device_shared_table_session(client, db_session, setup_cafe_environment):
    """
    5. Multi-Device Shared Table Cart & Bill:
    When multiple friends scan Table 1 QR on different phones, all connect to the
    exact same dining session and see the shared running bill.
    """
    table = setup_cafe_environment["table1"]
    qr = await TableService.rotate_qr_token(db_session, table.id)

    # Phone 1 scans
    scan1 = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
    data1 = scan1.json()

    # Phone 2 scans
    scan2 = await client.post("/api/v1/tables/qr/validate", json={"qr_token": qr.qr_token})
    data2 = scan2.json()

    # Both phones share identical session_id and session_token
    assert data1["session_id"] == data2["session_id"]
    assert data1["session_token"] == data2["session_token"]

    # Phone 1 orders 2 items
    order_payload = {
        "qr_token": qr.qr_token,
        "session_token": data1["session_token"],
        "items": [{"menu_item_id": 1, "quantity": 2}],
    }
    ord_res = await client.post(
        "/api/v1/orders",
        json=order_payload,
        headers={"X-Session-Token": data1["session_token"]},
    )
    assert ord_res.status_code == 201

    # Phone 2 queries the session bill -> sees the 2 items ordered by Phone 1!
    bill2 = await client.get(
        f"/api/v1/tables/sessions/{data2['session_id']}/bill",
        headers={"X-Session-Token": data2["session_token"]},
    )
    assert bill2.status_code == 200
    bill_data = bill2.json()
    assert len(bill_data["items"]) == 1
    assert bill_data["items"][0]["name"] == "Truffle Garlic Bread"
    assert bill_data["items"][0]["quantity"] == 2
    assert bill_data["subtotal"] == 700.0
