import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.branch import Branch
from app.models.table import Table


@pytest.mark.asyncio
async def test_upi_hold_and_payment_flow(client: AsyncClient, db_session: AsyncSession):
    # Setup branch and tables
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=1, branch_id=1, table_number="Table 1", capacity=4, status="Available")
    db_session.add(table)
    await db_session.commit()

    # 1. Customer holds Table 1 on Floor 1
    hold_payload = {
        "branch_id": 1,
        "customer_name": "Test Customer",
        "customer_phone": "+919111222333",
        "guest_count": 2,
        "reservation_date": "2026-10-01",
        "time_slot": "19:30",
        "floor_number": 1,
        "table_name": "Table 1",
        "table_id": 1,
    }
    res = await client.post("/api/v1/reservations/hold", json=hold_payload)
    assert res.status_code == 201
    hold_data = res.json()
    assert hold_data["status"] == "HOLD"
    assert hold_data["advance_amount"] == 400.0
    assert "upi://pay?" in hold_data["upi_uri"]
    assert hold_data["seconds_remaining"] == 420
    reservation_id = hold_data["reservation_id"]

    # 2. Conflicting customer attempts to hold same table for same slot -> 409
    conflicting_payload = {
        "branch_id": 1,
        "customer_name": "Second Customer",
        "customer_phone": "+919444555666",
        "guest_count": 2,
        "reservation_date": "2026-10-01",
        "time_slot": "19:30",
        "floor_number": 1,
        "table_name": "Table 1",
    }
    res_conflict = await client.post("/api/v1/reservations/hold", json=conflicting_payload)
    assert res_conflict.status_code == 409
    assert "SLOT_HELD" in res_conflict.json()["detail"]

    # 3. Customer pays via UPI and submits 12-digit UTR -> 200 CONFIRMED
    verify_payload = {
        "upi_utr": "426819283741",
        "customer_upi_vpa": "test@okhdfcbank",
    }
    verify_res = await client.post(f"/api/v1/reservations/{reservation_id}/verify-upi", json=verify_payload)
    assert verify_res.status_code == 200
    confirmed_data = verify_res.json()
    assert confirmed_data["status"] == "CONFIRMED"
    assert confirmed_data["payment_status"] == "PAID"
    assert confirmed_data["payment_reference"] == "426819283741"
    assert confirmed_data["advance_amount"] == 400.0

    # 4. Now that Table 1 is officially CONFIRMED, third customer gets 409 SLOT_BOOKED
    res_booked = await client.post("/api/v1/reservations/hold", json=conflicting_payload)
    assert res_booked.status_code == 409
    assert "SLOT_BOOKED" in res_booked.json()["detail"]


@pytest.mark.asyncio
async def test_upi_hold_cancellation_releases_table(client: AsyncClient, db_session: AsyncSession):
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=2, branch_id=1, table_number="Table 2", capacity=4, status="Available")
    db_session.add(table)
    await db_session.commit()

    # Hold Table 2
    hold_payload = {
        "branch_id": 1,
        "customer_name": "Cancelling User",
        "customer_phone": "+919777888999",
        "guest_count": 2,
        "reservation_date": "2026-10-02",
        "time_slot": "20:00",
        "floor_number": 1,
        "table_name": "Table 2",
        "table_id": 2,
    }
    res = await client.post("/api/v1/reservations/hold", json=hold_payload)
    assert res.status_code == 201
    res_id = res.json()["reservation_id"]

    # Customer cancels hold
    cancel_res = await client.post(f"/api/v1/reservations/{res_id}/cancel-hold")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Now table can be held by someone else immediately
    rehold_res = await client.post("/api/v1/reservations/hold", json=hold_payload)
    assert rehold_res.status_code == 201
    assert rehold_res.json()["status"] == "HOLD"


@pytest.mark.asyncio
async def test_utr_replay_attack_rejected(client: AsyncClient, db_session: AsyncSession):
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    t1 = Table(id=3, branch_id=1, table_number="Table 3", capacity=2, status="Available")
    t2 = Table(id=4, branch_id=1, table_number="Table 4", capacity=2, status="Available")
    db_session.add_all([t1, t2])
    await db_session.commit()

    # 1. First booking uses UTR 888899990000
    hold1 = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "User 1",
        "customer_phone": "+919111222333",
        "guest_count": 2,
        "reservation_date": "2026-10-05",
        "time_slot": "18:00",
        "floor_number": 1,
        "table_name": "Table 3",
        "table_id": 3,
    })
    assert hold1.status_code == 201
    res1_id = hold1.json()["reservation_id"]

    v1 = await client.post(f"/api/v1/reservations/{res1_id}/verify-upi", json={
        "upi_utr": "888899990000",
    })
    assert v1.status_code == 200
    assert v1.json()["status"] == "CONFIRMED"

    # 2. Second booking attempts to reuse the same UTR 888899990000 (even with spaces/dashes)
    hold2 = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "User 2",
        "customer_phone": "+919444555666",
        "guest_count": 2,
        "reservation_date": "2026-10-05",
        "time_slot": "18:00",
        "floor_number": 1,
        "table_name": "Table 4",
        "table_id": 4,
    })
    assert hold2.status_code == 201
    res2_id = hold2.json()["reservation_id"]

    v2 = await client.post(f"/api/v1/reservations/{res2_id}/verify-upi", json={
        "upi_utr": "8888 9999 0000",
    })
    assert v2.status_code == 409
    err = v2.json()
    assert "UTR_ALREADY_USED" in err["detail"]

