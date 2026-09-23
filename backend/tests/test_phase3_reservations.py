import pytest
from datetime import date
from sqlalchemy import select
from app.models.reservation import Reservation, ReservationCapacityRule
from app.models.branch import Branch
from app.models.customer import Customer
from unittest.mock import patch


@pytest.mark.asyncio
async def test_create_reservation_success(client, db_session):
    branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
    db_session.add(branch)
    rule = ReservationCapacityRule(
        branch_id=1,
        time_slot="19:00-20:00",
        max_guest_capacity=20,
        is_active=True,
    )
    db_session.add(rule)
    await db_session.commit()

    payload = {
        "branch_id": 1,
        "customer_name": "Marco Rossi",
        "customer_email": "marco@example.com",
        "customer_phone": "+919876543210",
        "guest_count": 4,
        "reservation_date": "2026-10-01",
        "time_slot": "19:00-20:00",
    }

    with patch("app.services.reservation_service.send_reservation_reminder.apply_async") as mock_celery:
        mock_celery.return_value.id = "mock-task-123"
        res = await client.post("/api/v1/reservations", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["guest_count"] == 4
        assert data["status"] == "CONFIRMED"
        assert data["celery_task_id"] == "mock-task-123"


@pytest.mark.asyncio
async def test_create_reservation_capacity_exceeded(client, db_session):
    branch = Branch(id=2, name="Jaadoo Branch 2", address="Lake City", phone="+919876543211")
    db_session.add(branch)
    rule = ReservationCapacityRule(
        branch_id=2,
        time_slot="20:00-21:00",
        max_guest_capacity=5,
        is_active=True,
    )
    db_session.add(rule)

    cust = Customer(name="Existing", phone="+919999999999")
    db_session.add(cust)
    await db_session.flush()

    resv_existing = Reservation(
        branch_id=2,
        customer_id=cust.id,
        guest_count=4,
        reservation_date=date(2026, 10, 2),
        time_slot="20:00-21:00",
        status="CONFIRMED",
    )
    db_session.add(resv_existing)
    await db_session.commit()

    payload = {
        "branch_id": 2,
        "customer_name": "Giuseppe",
        "customer_phone": "+919876543211",
        "guest_count": 3,
        "reservation_date": "2026-10-02",
        "time_slot": "20:00-21:00",
    }

    res = await client.post("/api/v1/reservations", json=payload)
    assert res.status_code == 400
    assert "CAPACITY_EXCEEDED" in res.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_status_transition(client, db_session):
    branch = Branch(id=3, name="Jaadoo Main 3", address="Old City Udaipur", phone="+919876543212")
    db_session.add(branch)
    cust = Customer(name="Sofia", phone="+919876543212")
    db_session.add(cust)
    await db_session.flush()

    resv = Reservation(
        branch_id=3,
        customer_id=cust.id,
        guest_count=2,
        reservation_date=date(2026, 10, 3),
        time_slot="18:00-19:00",
        status="CONFIRMED",
    )
    db_session.add(resv)
    await db_session.commit()
    await db_session.refresh(resv)

    # Attempt invalid transition CONFIRMED -> SEATED
    res = await client.patch(f"/api/v1/reservations/{resv.id}/status", json={"status": "SEATED"})
    assert res.status_code == 400
    assert "INVALID_STATUS_TRANSITION" in res.json()["detail"]

    # Valid transition CONFIRMED -> ARRIVED
    res_valid = await client.patch(f"/api/v1/reservations/{resv.id}/status", json={"status": "ARRIVED"})
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "ARRIVED"


@pytest.mark.asyncio
async def test_celery_task_revocation_on_cancel(client, db_session):
    branch = Branch(id=4, name="Jaadoo Main 4", address="Old City Udaipur", phone="+919876543213")
    db_session.add(branch)
    cust = Customer(name="Antonio", phone="+919876543213")
    db_session.add(cust)
    await db_session.flush()

    resv = Reservation(
        branch_id=4,
        customer_id=cust.id,
        guest_count=2,
        reservation_date=date(2026, 10, 4),
        time_slot="19:00-20:00",
        status="CONFIRMED",
        celery_task_id="celery-task-999",
    )
    db_session.add(resv)
    await db_session.commit()
    await db_session.refresh(resv)

    with patch("app.services.reservation_service.celery_app.control.revoke") as mock_revoke:
        res = await client.patch(f"/api/v1/reservations/{resv.id}/status", json={"status": "CANCELLED"})
        assert res.status_code == 200
        assert res.json()["status"] == "CANCELLED"
        assert res.json()["celery_task_id"] is None
        mock_revoke.assert_called_once_with("celery-task-999", terminate=True)

