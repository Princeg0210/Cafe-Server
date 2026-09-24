import pytest
import secrets
import datetime
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.api.deps import get_db
from app.core.security import hash_password, create_access_token
from app.models.branch import Branch
from app.models.user import User, Role, Permission, RolePermission
from app.models.table import Table, TableQR, DiningSession
from app.models.menu import MenuItem, MenuCategory
from app.models.order import Order, OrderItem
from app.models.kot import KOT
from app.services.table_service import TableService


@pytest.fixture
async def security_setup(db_session):
    """
    Sets up branch, users (pos staff and customer), roles, tables, and dining sessions.
    """
    # 1. Branch
    b_query = select(Branch).where(Branch.id == 1)
    res = await db_session.execute(b_query)
    branch = res.scalar_one_or_none()
    if not branch:
        branch = Branch(id=1, name="Jaadoo Main", address="Old City Udaipur", phone="+919876543210")
        db_session.add(branch)
        await db_session.flush()

    # 2. Permissions and Roles
    pos_perm = Permission(code="pos:access", description="POS Access")
    db_session.add(pos_perm)
    await db_session.flush()

    pos_role = Role(name="Cashier")
    cust_role = Role(name="Customer")
    db_session.add_all([pos_role, cust_role])
    await db_session.flush()

    db_session.add(RolePermission(role_id=pos_role.id, permission_id=pos_perm.id))
    await db_session.flush()

    # 3. Users
    staff_user = User(
        username="pos_cashier",
        email="cashier@example.com",
        hashed_password=hash_password("pass123"),
        role_id=pos_role.id,
        is_active=True,
    )
    cust_user = User(
        username="regular_customer",
        email="customer@example.com",
        hashed_password=hash_password("pass123"),
        role_id=cust_role.id,
        is_active=True,
    )
    db_session.add_all([staff_user, cust_user])
    await db_session.flush()

    # Tokens
    staff_jwt = create_access_token(subject=staff_user.id)
    cust_jwt = create_access_token(subject=cust_user.id)

    # 4. Tables with secure opaque QR tokens
    table1 = Table(branch_id=branch.id, table_number="T-01", capacity=4, status="Occupied")
    table2 = Table(branch_id=branch.id, table_number="T-02", capacity=4, status="Occupied")
    db_session.add_all([table1, table2])
    await db_session.flush()

    qr1_token = f"qr_sec_{secrets.token_urlsafe(32)}"
    qr2_token = f"qr_sec_{secrets.token_urlsafe(32)}"
    qr1 = TableQR(table_id=table1.id, qr_token=qr1_token, is_active=True)
    qr2 = TableQR(table_id=table2.id, qr_token=qr2_token, is_active=True)
    db_session.add_all([qr1, qr2])
    await db_session.flush()

    # 5. Dining Sessions
    sess1_token = f"sess_tok_t1_{secrets.token_urlsafe(24)}"
    sess2_token = f"sess_tok_t2_{secrets.token_urlsafe(24)}"
    sess1 = DiningSession(table_id=table1.id, session_token=sess1_token, status="ACTIVE")
    sess2 = DiningSession(table_id=table2.id, session_token=sess2_token, status="ACTIVE")
    db_session.add_all([sess1, sess2])
    await db_session.flush()

    # 6. Menu item & Orders & KOTs for testing leakage
    cat = MenuCategory(name="Pizzas", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    item = MenuItem(category_id=cat.id, name="Margherita", price=500.0, is_available=True, is_active=True)
    db_session.add(item)
    await db_session.flush()

    order1 = Order(dining_session_id=sess1.id, order_number="ORD-SEC-001", status="PENDING")
    order2 = Order(dining_session_id=sess2.id, order_number="ORD-SEC-002", status="PENDING")
    db_session.add_all([order1, order2])
    await db_session.flush()

    oi1 = OrderItem(order_id=order1.id, menu_item_id=item.id, quantity=1, unit_price=500.0, subtotal=500.0)
    oi2 = OrderItem(order_id=order2.id, menu_item_id=item.id, quantity=2, unit_price=500.0, subtotal=1000.0)
    db_session.add_all([oi1, oi2])
    await db_session.flush()

    kot1 = KOT(
        table_id=table1.id,
        dining_session_id=sess1.id,
        order_id=order1.id,
        kot_number="KOT-SEC-001",
        business_date=datetime.date.today(),
        sequence_number=1,
        total_amount=Decimal("500.00"),
        items_count=1,
        status="SENT",
        printed_status="FAILED",
    )
    db_session.add(kot1)
    await db_session.flush()

    # 7. Closed session for testing expired/closed rejection
    sess_closed_token = f"sess_tok_closed_{secrets.token_urlsafe(24)}"
    sess_closed = DiningSession(table_id=table1.id, session_token=sess_closed_token, status="CLOSED")
    db_session.add(sess_closed)
    await db_session.commit()

    return {
        "staff_user": staff_user,
        "cust_user": cust_user,
        "staff_jwt": staff_jwt,
        "cust_jwt": cust_jwt,
        "table1": table1,
        "table2": table2,
        "qr1_token": qr1_token,
        "qr2_token": qr2_token,
        "sess1": sess1,
        "sess2": sess2,
        "sess1_token": sess1_token,
        "sess2_token": sess2_token,
        "order1": order1,
        "order2": order2,
        "kot1": kot1,
        "sess_closed": sess_closed,
        "sess_closed_token": sess_closed_token,
    }


@pytest.fixture
async def sec_client(db_session):
    """
    Dedicated client without get_current_user overrides to test real authentication.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_1_unauthenticated_pos_api_rejected(sec_client):
    """1. Unauthenticated /pos API -> 401/403"""
    res1 = await sec_client.get("/api/v1/pos/kots")
    assert res1.status_code in [401, 403]

    res2 = await sec_client.get("/api/v1/pos/summary")
    assert res2.status_code in [401, 403]


@pytest.mark.asyncio
async def test_2_customer_attempting_pos_api_forbidden(sec_client, security_setup):
    """2. Customer attempting POS API -> 403 Forbidden"""
    headers = {"Authorization": f"Bearer {security_setup['cust_jwt']}"}

    res_kots = await sec_client.get("/api/v1/pos/kots", headers=headers)
    assert res_kots.status_code == 403

    res_sum = await sec_client.get("/api/v1/pos/summary", headers=headers)
    assert res_sum.status_code == 403


@pytest.mark.asyncio
async def test_3_valid_pos_user_allowed(sec_client, security_setup):
    """3. Valid POS user -> allowed (200 OK)"""
    headers = {"Authorization": f"Bearer {security_setup['staff_jwt']}"}

    res_kots = await sec_client.get("/api/v1/pos/kots", headers=headers)
    assert res_kots.status_code == 200

    res_sum = await sec_client.get("/api/v1/pos/summary", headers=headers)
    assert res_sum.status_code == 200


@pytest.mark.asyncio
async def test_4_table_1_cannot_access_table_data(sec_client, security_setup):
    """4. /table/1 -> cannot access table data, rejected with 400 INVALID_QR_TOKEN"""
    # Calling qr/validate with "1" or "table/1"
    res1 = await sec_client.post("/api/v1/tables/qr/validate", json={"qr_token": "1"})
    assert res1.status_code == 400
    assert "INVALID_QR_TOKEN" in res1.json()["detail"]

    res2 = await sec_client.post("/api/v1/tables/qr/validate", json={"qr_token": "/table/1"})
    assert res2.status_code == 400
    assert "INVALID_QR_TOKEN" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_5_table_1_session_token_can_access_table_1(sec_client, security_setup):
    """5. Table 1 session token -> can access Table 1 session and bill"""
    s = security_setup
    headers = {"X-Session-Token": s["sess1_token"]}

    res_sess = await sec_client.get(f"/api/v1/tables/sessions/{s['sess1'].id}", headers=headers)
    assert res_sess.status_code == 200
    assert res_sess.json()["id"] == s["sess1"].id

    res_bill = await sec_client.get(f"/api/v1/tables/sessions/{s['sess1'].id}/bill", headers=headers)
    assert res_bill.status_code == 200
    assert res_bill.json()["table_number"] == "T-01"


@pytest.mark.asyncio
async def test_6_table_1_session_token_cannot_access_table_2_session(sec_client, security_setup):
    """6. Table 1 session token -> cannot access Table 2 session (403 Forbidden)"""
    s = security_setup
    headers = {"X-Session-Token": s["sess1_token"]}

    res_sess2 = await sec_client.get(f"/api/v1/tables/sessions/{s['sess2'].id}", headers=headers)
    assert res_sess2.status_code == 403
    assert "Access denied" in res_sess2.json()["detail"]


@pytest.mark.asyncio
async def test_7_customer_cannot_access_another_tables_bill(sec_client, security_setup):
    """7. Customer cannot access another table's bill (403 Forbidden)"""
    s = security_setup
    # Table 1 tries to access Table 2's bill via tables/sessions and bills API
    headers = {"X-Session-Token": s["sess1_token"]}

    res_bill_t2 = await sec_client.get(f"/api/v1/tables/sessions/{s['sess2'].id}/bill", headers=headers)
    assert res_bill_t2.status_code == 403

    res_running_bill_t2 = await sec_client.get(f"/api/v1/bills/{s['sess2'].id}", headers=headers)
    assert res_running_bill_t2.status_code == 403


@pytest.mark.asyncio
async def test_8_customer_cannot_access_another_tables_kot(sec_client, security_setup):
    """8. Customer cannot access another table's KOT (401/403)"""
    s = security_setup
    # Customer without staff JWT or with customer JWT cannot query POS KOTs
    res_no_auth = await sec_client.get("/api/v1/pos/kots")
    assert res_no_auth.status_code in [401, 403]

    res_cust = await sec_client.get("/api/v1/pos/kots", headers={"Authorization": f"Bearer {s['cust_jwt']}"})
    assert res_cust.status_code == 403


@pytest.mark.asyncio
async def test_9_customer_cannot_close_another_tables_session(sec_client, security_setup):
    """9. Customer cannot close another table's session (403 Forbidden)"""
    s = security_setup
    # Table 1 session token tries to close Table 2 session
    headers = {"X-Session-Token": s["sess1_token"]}
    res = await sec_client.post(f"/api/v1/tables/sessions/{s['sess2'].id}/close", headers=headers)
    assert res.status_code == 403
    assert "Cannot close another table's dining session" in res.json()["detail"]


@pytest.mark.asyncio
async def test_10_customer_cannot_retry_pos_print(sec_client, security_setup):
    """10. Customer cannot retry POS print (401/403)"""
    s = security_setup
    kot_id = s["kot1"].id

    # Unauthenticated
    res1 = await sec_client.post(f"/api/v1/pos/kots/{kot_id}/retry-print")
    assert res1.status_code in [401, 403]

    # Customer JWT
    res2 = await sec_client.post(
        f"/api/v1/pos/kots/{kot_id}/retry-print",
        headers={"Authorization": f"Bearer {s['cust_jwt']}"},
    )
    assert res2.status_code == 403


@pytest.mark.asyncio
async def test_11_expired_or_closed_session_token_rejected(sec_client, security_setup):
    """11. Expired/closed session token -> rejected (403 Forbidden)"""
    s = security_setup
    headers = {"X-Session-Token": s["sess_closed_token"]}

    res = await sec_client.get(f"/api/v1/tables/sessions/{s['sess_closed'].id}/bill", headers=headers)
    assert res.status_code == 403
    assert "SESSION_EXPIRED" in res.json()["detail"]


@pytest.mark.asyncio
async def test_12_customer_cannot_access_another_tables_order(sec_client, security_setup):
    """12. Customer cannot access another table's order (403 Forbidden)"""
    s = security_setup
    # Table 1 tries to access Table 2's order
    headers = {"X-Session-Token": s["sess1_token"]}
    res = await sec_client.get(f"/api/v1/orders/{s['order2'].id}", headers=headers)
    assert res.status_code == 403
    assert "Cannot access order from another table session" in res.json()["detail"]
