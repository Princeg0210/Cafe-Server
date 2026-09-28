"""
Tests: Reservation-Aware Daily Pizza Dough Production Protection

Covers all 15 required test cases from the spec:

 1. test_reservation_dough_protection_blocks_walkin
 2. test_reservation_consumes_own_quota_first
 3. test_reservation_excess_uses_general_capacity
 4. test_reservation_cannot_consume_other_reservation_capacity
 5. test_cancellation_releases_unused_capacity
 6. test_no_show_releases_unused_capacity
 7. test_release_is_idempotent
 8. test_non_dough_items_bypass_daily_dough_capacity
 9. test_atomic_rollback_on_capacity_failure
10. test_concurrent_walkin_capacity  (sequential simulation)
11. test_multiple_reservations_protected_capacity
12. test_expected_pizza_count_overrides_default_ratio
13. test_default_ratio_used_when_expected_pizza_count_missing
14. test_protected_capacity_does_not_count_as_allocated_dough
15. test_hourly_oven_capacity_still_works
"""
import datetime
import math
import pytest
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.branch import Branch
from app.models.customer import Customer
from app.models.menu import MenuItem, MenuCategory
from app.models.reservation import Reservation
from app.models.capacity import ItemCapacityRule, DailyProductionRule, ReservationDoughAllocation
from app.models.inventory import InventoryItem, Recipe, RecipeItem
from app.services.capacity_service import CapacityService
from app.services.settings_service import SettingsService


# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------

async def _make_branch(db: AsyncSession, phone: str = "+919000000001") -> Branch:
    b = Branch(name="Test Branch", address="Udaipur", phone=phone)
    db.add(b)
    await db.flush()
    return b


async def _make_customer(db: AsyncSession, phone: str) -> Customer:
    c = Customer(name="Test Customer", phone=phone)
    db.add(c)
    await db.flush()
    return c


async def _make_pizza_item(
    db: AsyncSession,
    branch: Branch,
    with_dough_ingredient: bool = True,
    with_capacity_rule: bool = False,
    hourly_limit: int = 999,
) -> MenuItem:
    """Creates a pizza MenuItem with optional dough BOM and ItemCapacityRule."""
    cat = MenuCategory(name=f"Cat-{id(branch)}", display_order=1)
    db.add(cat)
    await db.flush()

    item = MenuItem(
        category_id=cat.id,
        name=f"Pizza-{id(branch)}",
        price=Decimal("350.00"),
        tax_rate=Decimal("5.00"),
    )
    db.add(item)
    await db.flush()

    if with_dough_ingredient:
        # Create dough inventory item + recipe
        inv = InventoryItem(
            sku=f"DOUGH-{item.id}",
            name=f"pizza dough ball {item.id}",
            unit_of_measure="pcs",
            current_stock=Decimal("1000"),
        )
        db.add(inv)
        await db.flush()

        recipe = Recipe(menu_item_id=item.id, name="Pizza Recipe")
        db.add(recipe)
        await db.flush()

        ri = RecipeItem(
            recipe_id=recipe.id,
            inventory_item_id=inv.id,
            quantity_required=Decimal("1"),
        )
        db.add(ri)
        await db.flush()

    if with_capacity_rule:
        rule = ItemCapacityRule(
            menu_item_id=item.id,
            max_production_limit=hourly_limit,
            allocated_count=0,
        )
        db.add(rule)
        await db.flush()

    return item


async def _make_drink_item(db: AsyncSession) -> MenuItem:
    """Creates a drink MenuItem with NO dough ingredient and NO ItemCapacityRule."""
    cat = MenuCategory(name=f"Drinks-{id(db)}", display_order=10)
    db.add(cat)
    await db.flush()

    item = MenuItem(
        category_id=cat.id,
        name=f"Lemonade-{id(db)}",
        price=Decimal("80.00"),
        tax_rate=Decimal("5.00"),
    )
    db.add(item)
    await db.flush()
    # No recipe, no capacity rule → not a pizza item
    return item


async def _make_daily_rule(
    db: AsyncSession, branch_id: int, limit: int, date: datetime.date
) -> DailyProductionRule:
    rule = DailyProductionRule(
        branch_id=branch_id,
        production_date=date,
        total_dough_limit=limit,
        total_allocated_dough=0,
    )
    db.add(rule)
    await db.flush()
    return rule


async def _make_reservation(
    db: AsyncSession,
    branch_id: int,
    customer_id: int,
    date: datetime.date,
    guests: int = 4,
    expected_pizza_count: int | None = None,
) -> Reservation:
    r = Reservation(
        branch_id=branch_id,
        customer_id=customer_id,
        guest_count=guests,
        reservation_date=date,
        time_slot="19:00",
        status="CONFIRMED",
        payment_status="PAID",
        advance_amount=Decimal(str(guests * 200)),
        expected_pizza_count=expected_pizza_count,
    )
    db.add(r)
    await db.flush()
    return r


async def _make_alloc(
    db: AsyncSession,
    reservation: Reservation,
    protected: int,
    consumed: int = 0,
    released: int = 0,
    status: str = "ACTIVE",
) -> ReservationDoughAllocation:
    alloc = ReservationDoughAllocation(
        reservation_id=reservation.id,
        branch_id=reservation.branch_id,
        production_date=reservation.reservation_date,
        initial_protected_qty=protected,
        consumed_qty=consumed,
        released_qty=released,
        status=status,
    )
    db.add(alloc)
    await db.flush()
    return alloc


# ---------------------------------------------------------------------------
# 1. Walk-in blocked by active protected reservation capacity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reservation_dough_protection_blocks_walkin(db_session: AsyncSession):
    """
    Total = 10, Protected = 4 (one active reservation).
    Walk-in pool = 10 - 0 - 4 = 6.
    Walk-in attempt 7 → REJECT.
    Walk-in attempt 6 → SUCCESS.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919010000001")
    branch_id = branch.id
    item = await _make_pizza_item(db_session, branch)
    item_id = item.id
    await _make_daily_rule(db_session, branch.id, limit=10, date=today)
    await db_session.commit()

    # Create a reservation and its allocation
    cust = await _make_customer(db_session, "+919010000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4)
    await _make_alloc(db_session, res, protected=4)
    await db_session.commit()

    # Walk-in of 7 should be rejected (only 6 available)
    with pytest.raises(HTTPException) as exc_info:
        await CapacityService.validate_and_allocate(
            db_session, item_id, 7, branch_id=branch_id, production_date=today
        )
    assert exc_info.value.status_code == 400
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail
    await db_session.rollback()

    # Walk-in of 6 should succeed
    await CapacityService.validate_and_allocate(
        db_session, item_id, 6, branch_id=branch_id, production_date=today
    )
    # Verify total_allocated_dough updated
    await db_session.commit()
    rule_res = await db_session.execute(
        select(DailyProductionRule).where(
            DailyProductionRule.branch_id == branch_id,
            DailyProductionRule.production_date == today,
        )
    )
    rule = rule_res.scalar_one()
    assert rule.total_allocated_dough == 6


# ---------------------------------------------------------------------------
# 2. Reservation consumes its own quota first
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reservation_consumes_own_quota_first(db_session: AsyncSession):
    """
    Protected = 4. Reservation orders 4.
    consumed_qty becomes 4. general pool untouched.
    total_allocated_dough = 4 (all via protected path).
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919020000001")
    item = await _make_pizza_item(db_session, branch)
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919020000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4)
    alloc = await _make_alloc(db_session, res, protected=4)
    await db_session.commit()

    await CapacityService.validate_and_allocate(
        db_session, item.id, 4,
        branch_id=branch.id, production_date=today, reservation_id=res.id
    )
    await db_session.commit()

    await db_session.refresh(alloc)
    assert alloc.consumed_qty == 4
    assert alloc.status == "EXHAUSTED"

    rule_res = await db_session.execute(
        select(DailyProductionRule).where(
            DailyProductionRule.branch_id == branch.id,
            DailyProductionRule.production_date == today,
        )
    )
    rule = rule_res.scalar_one()
    assert rule.total_allocated_dough == 4


# ---------------------------------------------------------------------------
# 3. Reservation excess uses general capacity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reservation_excess_uses_general_capacity(db_session: AsyncSession):
    """
    Protected = 4. Reservation orders 6.
    First 4 from protected, 2 from general.
    total_allocated_dough = 6.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919030000001")
    item = await _make_pizza_item(db_session, branch)
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919030000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4)
    alloc = await _make_alloc(db_session, res, protected=4)
    await db_session.commit()

    await CapacityService.validate_and_allocate(
        db_session, item.id, 6,
        branch_id=branch.id, production_date=today, reservation_id=res.id
    )
    await db_session.commit()

    await db_session.refresh(alloc)
    assert alloc.consumed_qty == 4
    assert alloc.status == "EXHAUSTED"

    rule_res = await db_session.execute(
        select(DailyProductionRule).where(
            DailyProductionRule.branch_id == branch.id,
            DailyProductionRule.production_date == today,
        )
    )
    rule = rule_res.scalar_one()
    assert rule.total_allocated_dough == 6


# ---------------------------------------------------------------------------
# 4. Reservation cannot consume another reservation's protected capacity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reservation_cannot_consume_other_reservation_capacity(db_session: AsyncSession):
    """
    Res A protected=5, Res B protected=5. Total=12.
    General available = 12 - 0 (allocated) - 10 (protected) = 2.
    Res A orders 7: uses own 5 + needs 2 from general (OK, 2 available).
    Res A orders 8: uses own 5 + needs 3 from general (FAIL, only 2 available).
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919040000001")
    branch_id = branch.id
    item = await _make_pizza_item(db_session, branch)
    item_id = item.id
    await _make_daily_rule(db_session, branch.id, limit=12, date=today)
    cust = await _make_customer(db_session, "+919040000002")
    res_a = await _make_reservation(db_session, branch.id, cust.id, today, guests=5)
    res_a_id = res_a.id
    res_b = await _make_reservation(db_session, branch.id, cust.id, today, guests=5)
    await _make_alloc(db_session, res_a, protected=5)
    await _make_alloc(db_session, res_b, protected=5)
    await db_session.commit()

    # Res A orders 8 → fails (protected=5, general available=2, needs 3 excess)
    with pytest.raises(HTTPException) as exc_info:
        await CapacityService.validate_and_allocate(
            db_session, item_id, 8,
            branch_id=branch_id, production_date=today, reservation_id=res_a_id
        )
    assert exc_info.value.status_code == 400
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail
    await db_session.rollback()

    # Res A orders 7 → succeeds (protected=5 + 2 general)
    await CapacityService.validate_and_allocate(
        db_session, item_id, 7,
        branch_id=branch_id, production_date=today, reservation_id=res_a_id
    )
    await db_session.commit()


# ---------------------------------------------------------------------------
# 5. Cancellation releases unused capacity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cancellation_releases_unused_capacity(db_session: AsyncSession):
    """
    Protected = 6, consumed = 2.
    After cancellation: released_qty = 4, status = RELEASED.
    Walk-in pool increases by 4.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919050000001")
    item = await _make_pizza_item(db_session, branch)
    await _make_daily_rule(db_session, branch.id, limit=10, date=today)
    cust = await _make_customer(db_session, "+919050000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=6)
    alloc = await _make_alloc(db_session, res, protected=6, consumed=2)
    await db_session.commit()

    await CapacityService.release_reservation_dough_allocation(db_session, res.id)
    await db_session.commit()

    await db_session.refresh(alloc)
    assert alloc.released_qty == 4
    assert alloc.status == "RELEASED"
    assert alloc.remaining_protected_qty == 0

    # Walk-in should now have access to the full general pool
    protected_remaining = await CapacityService._get_total_active_protected(
        db_session, branch.id, today
    )
    assert protected_remaining == 0


# ---------------------------------------------------------------------------
# 6. No-show releases unused capacity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_show_releases_unused_capacity(db_session: AsyncSession):
    """No-show: all 5 protected pizzas unused → all released."""
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919060000001")
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919060000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=5)
    alloc = await _make_alloc(db_session, res, protected=5)
    await db_session.commit()

    await CapacityService.release_reservation_dough_allocation(db_session, res.id)
    await db_session.commit()

    await db_session.refresh(alloc)
    assert alloc.released_qty == 5
    assert alloc.status == "RELEASED"


# ---------------------------------------------------------------------------
# 7. Release is idempotent
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_release_is_idempotent(db_session: AsyncSession):
    """Calling release twice does NOT double-release."""
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919070000001")
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919070000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4)
    alloc = await _make_alloc(db_session, res, protected=4)
    await db_session.commit()

    # First release
    await CapacityService.release_reservation_dough_allocation(db_session, res.id)
    await db_session.commit()

    # Second release — should be a no-op (status is no longer ACTIVE)
    result = await CapacityService.release_reservation_dough_allocation(db_session, res.id)
    await db_session.commit()
    assert result is None  # None means already released

    await db_session.refresh(alloc)
    assert alloc.released_qty == 4
    assert alloc.status == "RELEASED"


# ---------------------------------------------------------------------------
# 8. Non-dough items bypass daily dough capacity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_non_dough_items_bypass_daily_dough_capacity(db_session: AsyncSession):
    """
    Daily dough pool is fully exhausted (all allocated).
    A drink item with no dough ingredient and no ItemCapacityRule
    must NOT be blocked by the dough pool check.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919080000001")
    drink = await _make_drink_item(db_session)
    await _make_daily_rule(db_session, branch.id, limit=10, date=today)
    await db_session.commit()

    # Exhaust the walk-in pool completely
    pizza = await _make_pizza_item(db_session, branch)
    await db_session.commit()
    await CapacityService.validate_and_allocate(
        db_session, pizza.id, 10, branch_id=branch.id, production_date=today
    )
    await db_session.commit()

    # Drink must still succeed even though dough pool is exhausted
    await CapacityService.validate_and_allocate(
        db_session, drink.id, 5, branch_id=branch.id, production_date=today
    )
    await db_session.commit()  # No exception = pass


# ---------------------------------------------------------------------------
# 9. Atomic rollback on capacity failure
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_atomic_rollback_on_capacity_failure(db_session: AsyncSession):
    """
    If daily dough capacity fails, total_allocated_dough must not increase.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919090000001")
    branch_id = branch.id
    item = await _make_pizza_item(db_session, branch)
    item_id = item.id
    rule = await _make_daily_rule(db_session, branch.id, limit=5, date=today)
    rule_id = rule.id
    await db_session.commit()

    initial_allocated = rule.total_allocated_dough

    with pytest.raises(HTTPException):
        # Request 10 but limit is 5 → must fail
        await CapacityService.validate_and_allocate(
            db_session, item_id, 10, branch_id=branch_id, production_date=today
        )

    await db_session.rollback()

    # Re-fetch rule and verify no increment
    rule_res = await db_session.execute(
        select(DailyProductionRule).where(DailyProductionRule.id == rule_id)
    )
    refreshed = rule_res.scalar_one()
    assert refreshed.total_allocated_dough == initial_allocated


# ---------------------------------------------------------------------------
# 10. Concurrent walk-in capacity (sequential simulation)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_walkin_capacity(db_session: AsyncSession):
    """
    Sequential simulation of two walk-ins trying to consume the same pool.
    Total = 10, no reservations.
    First order of 7 succeeds. Second of 4 fails.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919100000001")
    branch_id = branch.id
    item = await _make_pizza_item(db_session, branch)
    item_id = item.id
    await _make_daily_rule(db_session, branch.id, limit=10, date=today)
    await db_session.commit()

    # First walk-in: 7
    await CapacityService.validate_and_allocate(
        db_session, item_id, 7, branch_id=branch_id, production_date=today
    )
    await db_session.commit()

    # Second walk-in: 4 → only 3 left
    with pytest.raises(HTTPException) as exc_info:
        await CapacityService.validate_and_allocate(
            db_session, item_id, 4, branch_id=branch_id, production_date=today
        )
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail
    await db_session.rollback()

    # Walk-in of 3 should succeed
    await CapacityService.validate_and_allocate(
        db_session, item_id, 3, branch_id=branch_id, production_date=today
    )
    await db_session.commit()

    rule_res = await db_session.execute(
        select(DailyProductionRule).where(
            DailyProductionRule.branch_id == branch_id,
            DailyProductionRule.production_date == today,
        )
    )
    rule = rule_res.scalar_one()
    assert rule.total_allocated_dough == 10


# ---------------------------------------------------------------------------
# 11. Multiple reservations protected capacity aggregates correctly
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_multiple_reservations_protected_capacity(db_session: AsyncSession):
    """
    Res A protected=5, Res B protected=8. Total=20.
    General walk-in pool = 20 - 0 - 13 = 7.
    Walk-in of 7 succeeds. Walk-in of 8 fails.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919110000001")
    branch_id = branch.id
    item = await _make_pizza_item(db_session, branch)
    item_id = item.id
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919110000002")
    res_a = await _make_reservation(db_session, branch.id, cust.id, today, guests=5)
    res_b = await _make_reservation(db_session, branch.id, cust.id, today, guests=8)
    await _make_alloc(db_session, res_a, protected=5)
    await _make_alloc(db_session, res_b, protected=8)
    await db_session.commit()

    # Walk-in of 8 fails
    with pytest.raises(HTTPException) as exc_info:
        await CapacityService.validate_and_allocate(
            db_session, item_id, 8, branch_id=branch_id, production_date=today
        )
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail
    await db_session.rollback()

    # Walk-in of 7 succeeds
    await CapacityService.validate_and_allocate(
        db_session, item_id, 7, branch_id=branch_id, production_date=today
    )
    await db_session.commit()


# ---------------------------------------------------------------------------
# 12. expected_pizza_count overrides default ratio
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_expected_pizza_count_overrides_default_ratio(db_session: AsyncSession):
    """
    guest_count=4, default ratio=0.75 → expected = ceil(3) = 3.
    But if expected_pizza_count=6, protected must be 6.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919120000001")
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919120000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4, expected_pizza_count=6)
    await db_session.commit()

    alloc = await CapacityService.create_reservation_dough_allocation(
        db_session,
        reservation_id=res.id,
        branch_id=res.branch_id,
        reservation_date=res.reservation_date,
        guest_count=res.guest_count,
        expected_pizza_count=res.expected_pizza_count,
    )
    await db_session.commit()

    assert alloc.initial_protected_qty == 6


# ---------------------------------------------------------------------------
# 13. Default ratio used when expected_pizza_count is missing
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_default_ratio_used_when_expected_pizza_count_missing(db_session: AsyncSession):
    """
    guest_count=4, ratio=0.75 → ceil(4 * 0.75) = ceil(3.0) = 3.
    No expected_pizza_count → use configured ratio.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919130000001")
    await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919130000002")
    # Configure ratio to 0.75 in settings
    await SettingsService.set_setting(db_session, "RESERVATION_PIZZA_DEMAND_PER_GUEST", "0.75")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4, expected_pizza_count=None)
    await db_session.commit()

    alloc = await CapacityService.create_reservation_dough_allocation(
        db_session,
        reservation_id=res.id,
        branch_id=res.branch_id,
        reservation_date=res.reservation_date,
        guest_count=res.guest_count,
        expected_pizza_count=None,
    )
    await db_session.commit()

    expected = math.ceil(4 * 0.75)  # = 3
    assert alloc.initial_protected_qty == expected


# ---------------------------------------------------------------------------
# 14. Protected capacity is NOT counted as allocated dough
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_protected_capacity_does_not_count_as_allocated_dough(db_session: AsyncSession):
    """
    Critical invariant: creating a reservation allocation must NOT
    increment total_allocated_dough. Only actual order consumption does.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919140000001")
    rule = await _make_daily_rule(db_session, branch.id, limit=20, date=today)
    cust = await _make_customer(db_session, "+919140000002")
    res = await _make_reservation(db_session, branch.id, cust.id, today, guests=4, expected_pizza_count=8)
    await db_session.commit()

    initial_allocated = rule.total_allocated_dough  # must be 0

    # Create the allocation
    await CapacityService.create_reservation_dough_allocation(
        db_session,
        reservation_id=res.id,
        branch_id=res.branch_id,
        reservation_date=res.reservation_date,
        guest_count=res.guest_count,
        expected_pizza_count=res.expected_pizza_count,
    )
    await db_session.commit()

    # Reload the rule — total_allocated_dough must still be 0
    rule_res = await db_session.execute(
        select(DailyProductionRule).where(DailyProductionRule.id == rule.id)
    )
    refreshed_rule = rule_res.scalar_one()
    assert refreshed_rule.total_allocated_dough == initial_allocated == 0


# ---------------------------------------------------------------------------
# 15. Hourly oven capacity still works (ItemCapacityRule preserved)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hourly_oven_capacity_still_works(db_session: AsyncSession):
    """
    ItemCapacityRule with max_production_limit=5.
    Ordering 6 must raise PIZZA_SOLD_OUT from the hourly check.
    The daily dough pool has plenty of capacity, so the hourly check fires first.
    """
    today = datetime.date.today()
    branch = await _make_branch(db_session, "+919150000001")
    branch_id = branch.id
    # Create a pizza item with both a dough ingredient AND an hourly cap of 5
    item = await _make_pizza_item(
        db_session, branch, with_dough_ingredient=True, with_capacity_rule=True, hourly_limit=5
    )
    item_id = item.id
    await _make_daily_rule(db_session, branch.id, limit=100, date=today)
    await db_session.commit()

    # Attempt to order 6 (hourly limit is 5) → must fail at hourly check
    with pytest.raises(HTTPException) as exc_info:
        await CapacityService.validate_and_allocate(
            db_session, item_id, 6, branch_id=branch_id, production_date=today
        )
    assert exc_info.value.status_code == 400
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail
    await db_session.rollback()

    # Ordering 5 (within limit) → must succeed
    await CapacityService.validate_and_allocate(
        db_session, item_id, 5, branch_id=branch_id, production_date=today
    )
    await db_session.commit()

    # Ordering 1 more → hourly capacity exhausted
    with pytest.raises(HTTPException) as exc_info2:
        await CapacityService.validate_and_allocate(
            db_session, item_id, 1, branch_id=branch_id, production_date=today
        )
    assert "PIZZA_SOLD_OUT" in exc_info2.value.detail
    await db_session.rollback()
