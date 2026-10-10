import pytest
import datetime
from sqlalchemy import select
from app.models.reservation import Reservation, ReservationCapacityRule
from app.models.branch import Branch
from app.models.customer import Customer
from app.utils.helpers import ist_now
from unittest.mock import patch


@pytest.mark.asyncio
async def test_seven_day_reservation_policy_and_id_consistency(client, db_session):
    # Setup branch
    branch = Branch(id=99, name="Jaadoo Main 99", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)

    # Setup customers
    cust_recent = Customer(name="Recent Guest", phone="+919876543211", email="recent@example.com")
    cust_cutoff = Customer(name="Cutoff Boundary Guest", phone="+919876543222", email="cutoff@example.com")
    cust_old = Customer(name="Old Historical Guest", phone="+919876543233", email="old@example.com")
    db_session.add_all([cust_recent, cust_cutoff, cust_old])
    await db_session.flush()

    today = ist_now().date()
    cutoff_date = today - datetime.timedelta(days=6)  # 7th day inclusive
    older_date = today - datetime.timedelta(days=7)   # 8 days ago (older than 7 days)

    # 1. Recent reservation (Today)
    res_recent = Reservation(
        id=901,
        branch_id=99,
        customer_id=cust_recent.id,
        guest_count=4,
        reservation_date=today,
        time_slot="07:00 PM",
        table_name="Table 2",
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=600.0,
        payment_reference="pay_recent_123",
        upi_utr="UTR-REC-111",
    )

    # 2. Boundary reservation (Cutoff date - exactly 6 days ago, inclusive 7-day window)
    res_cutoff = Reservation(
        id=902,
        branch_id=99,
        customer_id=cust_cutoff.id,
        guest_count=2,
        reservation_date=cutoff_date,
        time_slot="08:15 PM",
        table_name="Table 1",
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=300.0,
        payment_reference="pay_cutoff_222",
        upi_utr="UTR-CUT-222",
    )

    # 3. Old reservation (>7 days ago)
    res_old = Reservation(
        id=903,
        branch_id=99,
        customer_id=cust_old.id,
        guest_count=5,
        reservation_date=older_date,
        time_slot="09:15 PM",
        table_name="Table 3",
        status="COMPLETED",
        payment_status="PAID",
        advance_amount=750.0,
        payment_reference="pay_old_333",
        upi_utr="UTR-OLD-333",
    )

    db_session.add_all([res_recent, res_cutoff, res_old])
    await db_session.commit()

    # Test list endpoint
    response = await client.get("/api/v1/reservations")
    assert response.status_code == 200
    data = response.json()

    # Check Recent record
    item_recent = next((r for r in data if r["id"] == 901), None)
    assert item_recent is not None
    assert item_recent["booking_id"] == "RES-0901"
    assert item_recent["customer"]["name"] == "Recent Guest"
    assert item_recent["customer"]["phone"] == "+919876543211"
    assert item_recent["time_slot"] == "07:00 PM"
    assert item_recent["guest_count"] == 4
    assert item_recent["is_historical_limited"] is False
    assert item_recent["advance_amount"] == 600.0

    # Check Cutoff boundary record (should be full details)
    item_cutoff = next((r for r in data if r["id"] == 902), None)
    assert item_cutoff is not None
    assert item_cutoff["booking_id"] == "RES-0902"
    assert item_cutoff["customer"]["name"] == "Cutoff Boundary Guest"
    assert item_cutoff["customer"]["phone"] == "+919876543222"
    assert item_cutoff["time_slot"] == "08:15 PM"
    assert item_cutoff["is_historical_limited"] is False

    # Check Old record (> 7 days: must be sanitized to ONLY id, name, guest_count)
    item_old = next((r for r in data if r["id"] == 903), None)
    assert item_old is not None
    assert item_old["booking_id"] == "RES-0903"
    assert item_old["customer"]["name"] == "Old Historical Guest"
    assert item_old["customer"]["phone"] == ""
    assert item_old["customer"]["email"] is None
    assert item_old["guest_count"] == 5
    assert item_old["time_slot"] == ""
    assert item_old["advance_amount"] is None
    assert item_old["payment_reference"] is None
    assert item_old["upi_utr"] is None
    assert item_old["is_historical_limited"] is True

    # Test direct single-record lookup GET /api/v1/reservations/{id}
    # 1. Recent single lookup
    single_recent = await client.get("/api/v1/reservations/901")
    assert single_recent.status_code == 200
    s_recent_data = single_recent.json()
    assert s_recent_data["customer"]["phone"] == "+919876543211"

    # 2. Old single lookup (must also obey policy!)
    single_old = await client.get("/api/v1/reservations/903")
    assert single_old.status_code == 200
    s_old_data = single_old.json()
    assert s_old_data["customer"]["name"] == "Old Historical Guest"
    assert s_old_data["customer"]["phone"] == ""
    assert s_old_data["customer"]["email"] is None
    assert s_old_data["is_historical_limited"] is True
    assert s_old_data["advance_amount"] is None

    # Test Search by Canonical Booking ID
    search_res = await client.get("/api/v1/reservations?search=RES-0901")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data) >= 1
    assert any(r["id"] == 901 for r in search_data)

    # Test Search by numeric ID
    search_num = await client.get("/api/v1/reservations?search=902")
    assert search_num.status_code == 200
    assert any(r["id"] == 902 for r in search_num.json())
