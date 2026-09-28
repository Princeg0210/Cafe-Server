import datetime
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.reservation import Reservation
from app.models.capacity import DailyProductionRule, ReservationDoughAllocation


@pytest.mark.asyncio
async def test_daily_production_branch_date_uniqueness(db_session: AsyncSession):
    """Test unique constraint on (branch_id, production_date) for DailyProductionRule."""
    branch = Branch(name="Daily Prod Branch 1", address="Udaipur", phone="+919000000001")
    db_session.add(branch)
    await db_session.flush()

    today = datetime.date.today()

    rule1 = DailyProductionRule(
        branch_id=branch.id,
        production_date=today,
        total_dough_limit=150,
        total_allocated_dough=0,
    )
    db_session.add(rule1)
    await db_session.commit()

    # Attempt to add a duplicate rule for same branch and date
    rule2 = DailyProductionRule(
        branch_id=branch.id,
        production_date=today,
        total_dough_limit=100,
        total_allocated_dough=0,
    )
    db_session.add(rule2)

    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_reservation_dough_allocation_uniqueness(db_session: AsyncSession):
    """Test unique constraint on reservation_id for ReservationDoughAllocation."""
    branch = Branch(name="Daily Prod Branch 2", address="Udaipur", phone="+919000000002")
    customer = Customer(name="Res Alloc Customer", phone="+919000000003")
    db_session.add_all([branch, customer])
    await db_session.flush()

    res = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        guest_count=4,
        reservation_date=datetime.date.today(),
        time_slot="19:30",
        expected_pizza_count=3,
    )
    db_session.add(res)
    await db_session.flush()

    alloc1 = ReservationDoughAllocation(
        reservation_id=res.id,
        branch_id=branch.id,
        production_date=datetime.date.today(),
        initial_protected_qty=3,
        consumed_qty=0,
        released_qty=0,
        status="ACTIVE",
    )
    db_session.add(alloc1)
    await db_session.commit()

    # Attempt to add duplicate allocation for same reservation
    alloc2 = ReservationDoughAllocation(
        reservation_id=res.id,
        branch_id=branch.id,
        production_date=datetime.date.today(),
        initial_protected_qty=2,
        consumed_qty=0,
        released_qty=0,
        status="ACTIVE",
    )
    db_session.add(alloc2)

    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_expected_pizza_count_nullable(db_session: AsyncSession):
    """Test expected_pizza_count field is optional/nullable on Reservation."""
    branch = Branch(name="Nullable Branch", address="Udaipur", phone="+919000000004")
    customer = Customer(name="Nullable Cust", phone="+919000000005")
    db_session.add_all([branch, customer])
    await db_session.flush()

    # Without explicit expected_pizza_count
    res1 = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        guest_count=2,
        reservation_date=datetime.date.today(),
        time_slot="20:00",
    )
    # With explicit expected_pizza_count
    res2 = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        guest_count=5,
        reservation_date=datetime.date.today(),
        time_slot="20:30",
        expected_pizza_count=4,
    )
    db_session.add_all([res1, res2])
    await db_session.commit()

    assert res1.expected_pizza_count is None
    assert res2.expected_pizza_count == 4


@pytest.mark.asyncio
async def test_valid_defaults_and_properties(db_session: AsyncSession):
    """Test defaults and remaining_protected_qty property helper."""
    branch = Branch(name="Defaults Branch", address="Udaipur", phone="+919000000006")
    customer = Customer(name="Defaults Cust", phone="+919000000007")
    db_session.add_all([branch, customer])
    await db_session.flush()

    res = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        guest_count=3,
        reservation_date=datetime.date.today(),
        time_slot="21:00",
    )
    db_session.add(res)
    await db_session.flush()

    alloc = ReservationDoughAllocation(
        reservation_id=res.id,
        branch_id=branch.id,
        production_date=datetime.date.today(),
        initial_protected_qty=3,
    )
    db_session.add(alloc)
    await db_session.commit()

    assert alloc.consumed_qty == 0
    assert alloc.released_qty == 0
    assert alloc.status == "ACTIVE"
    assert alloc.remaining_protected_qty == 3

    # Partial consumption
    alloc.consumed_qty = 2
    assert alloc.remaining_protected_qty == 1

    # Release remaining
    alloc.released_qty = 1
    alloc.status = "RELEASED"
    assert alloc.remaining_protected_qty == 0


@pytest.mark.asyncio
async def test_allocation_status_values(db_session: AsyncSession):
    """Test valid allocation status values ('ACTIVE', 'RELEASED', 'EXHAUSTED')."""
    branch = Branch(name="Status Branch", address="Udaipur", phone="+919000000008")
    customer = Customer(name="Status Cust", phone="+919000000009")
    db_session.add_all([branch, customer])
    await db_session.flush()

    res = Reservation(
        branch_id=branch.id,
        customer_id=customer.id,
        guest_count=2,
        reservation_date=datetime.date.today(),
        time_slot="18:00",
    )
    db_session.add(res)
    await db_session.flush()

    alloc = ReservationDoughAllocation(
        reservation_id=res.id,
        branch_id=branch.id,
        production_date=datetime.date.today(),
        initial_protected_qty=2,
        status="EXHAUSTED",
    )
    db_session.add(alloc)
    await db_session.commit()

    assert alloc.status == "EXHAUSTED"
