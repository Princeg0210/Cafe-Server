import pytest
import asyncio
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

    # 3. Bank Webhook confirms payment of ₹400 for UTR 426819283741
    webhook_res = await client.post("/api/v1/reservations/bank-webhook", json={
        "utr": "426819283741",
        "amount": 400.0,
        "merchant_vpa": "9460555743-2@ybl",
        "payer_vpa": "test@okhdfcbank",
        "tx_status": "SETTLED",
    })
    assert webhook_res.status_code == 200

    # 4. Customer verifies payment -> 200 CONFIRMED
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

    # 5. Now that Table 1 is officially CONFIRMED, third customer gets 409 SLOT_BOOKED
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
async def test_random_utr_rejected_without_payment(client: AsyncClient, db_session: AsyncSession):
    """
    Test 1: Random UTR + no payment -> REJECTED (HTTP 402 PAYMENT_NOT_VERIFIED)
    """
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=10, branch_id=1, table_number="Table 10", capacity=2, status="Available")
    db_session.add(table)
    await db_session.commit()

    hold_res = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "Random User",
        "customer_phone": "+919888777666",
        "guest_count": 2,
        "reservation_date": "2026-10-10",
        "time_slot": "19:00",
        "floor_number": 1,
        "table_name": "Table 10",
        "table_id": 10,
    })
    assert hold_res.status_code == 201
    res_id = hold_res.json()["reservation_id"]

    verify_res = await client.post(f"/api/v1/reservations/{res_id}/verify-upi", json={
        "upi_utr": "random_utr_abc123",
    })
    assert verify_res.status_code == 402
    assert "PAYMENT_NOT_VERIFIED" in verify_res.json()["detail"]

    # Ensure status remained PAYMENT_PENDING and NOT CONFIRMED
    get_res = await client.get(f"/api/v1/reservations/{res_id}")
    assert get_res.json()["status"] == "PAYMENT_PENDING"
    assert get_res.json()["payment_status"] == "PENDING_VERIFICATION"


@pytest.mark.asyncio
async def test_fake_transaction_id_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    Test 2: Fake transaction ID -> REJECTED (HTTP 402 PAYMENT_NOT_VERIFIED)
    """
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=11, branch_id=1, table_number="Table 11", capacity=2, status="Available")
    db_session.add(table)
    await db_session.commit()

    hold_res = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "Fake Txn User",
        "customer_phone": "+919555666777",
        "guest_count": 2,
        "reservation_date": "2026-10-10",
        "time_slot": "20:00",
        "floor_number": 1,
        "table_name": "Table 11",
        "table_id": 11,
    })
    res_id = hold_res.json()["reservation_id"]

    verify_res = await client.post(f"/api/v1/reservations/{res_id}/verify-upi", json={
        "upi_utr": "FAKE-TXN-99998888",
    })
    assert verify_res.status_code == 402
    assert "PAYMENT_NOT_VERIFIED" in verify_res.json()["detail"]


@pytest.mark.asyncio
async def test_valid_format_nonexistent_utr_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    Test 3: Valid-format 12-digit but nonexistent UTR -> REJECTED (HTTP 402 PAYMENT_NOT_VERIFIED)
    """
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=12, branch_id=1, table_number="Table 12", capacity=2, status="Available")
    db_session.add(table)
    await db_session.commit()

    hold_res = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "Valid Format User",
        "customer_phone": "+919444333222",
        "guest_count": 2,
        "reservation_date": "2026-10-10",
        "time_slot": "21:00",
        "floor_number": 1,
        "table_name": "Table 12",
        "table_id": 12,
    })
    res_id = hold_res.json()["reservation_id"]

    # Exact valid 12-digit NPCI format: 426819283799
    verify_res = await client.post(f"/api/v1/reservations/{res_id}/verify-upi", json={
        "upi_utr": "426819283799",
    })
    assert verify_res.status_code == 402
    assert "PAYMENT_NOT_VERIFIED" in verify_res.json()["detail"]


@pytest.mark.asyncio
async def test_same_verified_utr_cannot_be_reused(client: AsyncClient, db_session: AsyncSession):
    """
    Test 4: Same verified UTR cannot be reused across reservations (HTTP 409 UTR_ALREADY_USED)
    """
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    t1 = Table(id=13, branch_id=1, table_number="Table 13", capacity=2, status="Available")
    t2 = Table(id=14, branch_id=1, table_number="Table 14", capacity=2, status="Available")
    db_session.add_all([t1, t2])
    await db_session.commit()

    # Genuine bank settlement webhook for UTR 998877665544
    await client.post("/api/v1/reservations/bank-webhook", json={
        "utr": "998877665544",
        "amount": 400.0,
        "merchant_vpa": "9460555743-2@ybl",
        "tx_status": "SETTLED",
    })

    # First customer holds Table 13 and verifies with 998877665544 -> SUCCESS
    hold1 = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "Legit User",
        "customer_phone": "+919111222333",
        "guest_count": 2,
        "reservation_date": "2026-10-12",
        "time_slot": "18:00",
        "floor_number": 1,
        "table_name": "Table 13",
        "table_id": 13,
    })
    res1_id = hold1.json()["reservation_id"]
    v1 = await client.post(f"/api/v1/reservations/{res1_id}/verify-upi", json={
        "upi_utr": "998877665544",
    })
    assert v1.status_code == 200
    assert v1.json()["status"] == "CONFIRMED"

    # Second customer tries to claim Table 14 with the same UTR -> 409 REJECTED
    hold2 = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "Replay User",
        "customer_phone": "+919444555666",
        "guest_count": 2,
        "reservation_date": "2026-10-12",
        "time_slot": "18:00",
        "floor_number": 1,
        "table_name": "Table 14",
        "table_id": 14,
    })
    res2_id = hold2.json()["reservation_id"]
    v2 = await client.post(f"/api/v1/reservations/{res2_id}/verify-upi", json={
        "upi_utr": "9988-7766-5544",
    })
    assert v2.status_code == 409
    assert "UTR_ALREADY_USED" in v2.json()["detail"]


@pytest.mark.asyncio
async def test_only_genuinely_verified_payment_confirms(client: AsyncClient, db_session: AsyncSession):
    """
    Test 5: Only genuinely verified payment -> CONFIRMED + PAID
    """
    branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
    db_session.add(branch)
    table = Table(id=15, branch_id=1, table_number="Table 15", capacity=2, status="Available")
    db_session.add(table)
    await db_session.commit()

    # 1. Hold table
    hold_res = await client.post("/api/v1/reservations/hold", json={
        "branch_id": 1,
        "customer_name": "Genuine Payer",
        "customer_phone": "+919876500000",
        "guest_count": 2,
        "reservation_date": "2026-10-15",
        "time_slot": "19:00",
        "floor_number": 1,
        "table_name": "Table 15",
        "table_id": 15,
    })
    res_id = hold_res.json()["reservation_id"]

    # 2. Before webhook arrives, verification MUST fail
    pre_res = await client.post(f"/api/v1/reservations/{res_id}/verify-upi", json={
        "upi_utr": "GENUINE-UTR-777",
    })
    assert pre_res.status_code == 402

    # 3. Bank sends webhook verifying ₹400 credit
    wb_res = await client.post("/api/v1/reservations/bank-webhook", json={
        "utr": "GENUINE-UTR-777",
        "amount": 400.0,
        "merchant_vpa": "9460555743-2@ybl",
        "tx_status": "SETTLED",
    })
    assert wb_res.status_code == 200

    # 4. Now verification succeeds -> CONFIRMED & PAID
    post_res = await client.post(f"/api/v1/reservations/{res_id}/verify-upi", json={
        "upi_utr": "GENUINE-UTR-777",
    })
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "CONFIRMED"
    assert post_res.json()["payment_status"] == "PAID"


@pytest.mark.asyncio
async def test_concurrent_verification_cannot_double_confirm(client: AsyncClient, db_session: AsyncSession):
    """
    Test 6: Concurrent verification cannot double-confirm
    """
    from tests.conftest import TestingSessionLocal
    from app.main import app
    from app.api.deps import get_db

    async def separate_get_db():
        async with TestingSessionLocal() as s:
            yield s

    app.dependency_overrides[get_db] = separate_get_db

    try:
        branch = Branch(id=1, name="Old City", address="Lake Pichola, Udaipur", phone="+919876543210")
        db_session.add(branch)
        t1 = Table(id=16, branch_id=1, table_number="Table 16", capacity=2, status="Available")
        t2 = Table(id=17, branch_id=1, table_number="Table 17", capacity=2, status="Available")
        db_session.add_all([t1, t2])
        await db_session.commit()

        # Pre-seed single verified bank credit for ₹400
        await client.post("/api/v1/reservations/bank-webhook", json={
            "utr": "CONCURRENT-UTR-123",
            "amount": 400.0,
            "merchant_vpa": "9460555743-2@ybl",
            "tx_status": "SETTLED",
        })

        # Two users hold two tables
        h1 = await client.post("/api/v1/reservations/hold", json={
            "branch_id": 1,
            "customer_name": "Concurrent 1",
            "customer_phone": "+919111111111",
            "guest_count": 2,
            "reservation_date": "2026-10-18",
            "time_slot": "19:00",
            "floor_number": 1,
            "table_name": "Table 16",
            "table_id": 16,
        })
        h2 = await client.post("/api/v1/reservations/hold", json={
            "branch_id": 1,
            "customer_name": "Concurrent 2",
            "customer_phone": "+919222222222",
            "guest_count": 2,
            "reservation_date": "2026-10-18",
            "time_slot": "19:00",
            "floor_number": 1,
            "table_name": "Table 17",
            "table_id": 17,
        })
        r1_id = h1.json()["reservation_id"]
        r2_id = h2.json()["reservation_id"]

        # Both try to verify concurrently using the single bank credit
        res1, res2 = await asyncio.gather(
            client.post(f"/api/v1/reservations/{r1_id}/verify-upi", json={"upi_utr": "CONCURRENT-UTR-123"}),
            client.post(f"/api/v1/reservations/{r2_id}/verify-upi", json={"upi_utr": "CONCURRENT-UTR-123"}),
        )

        statuses = {res1.status_code, res2.status_code}
        assert 200 in statuses
        assert 409 in statuses  # Exactly one succeeds, one gets 409 UTR_ALREADY_USED
    finally:
        async def restore_get_db():
            yield db_session
        app.dependency_overrides[get_db] = restore_get_db
