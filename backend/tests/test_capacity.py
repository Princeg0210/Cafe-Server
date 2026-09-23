import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.menu import MenuCategory, MenuItem
from app.models.capacity import ItemCapacityRule
from app.services.capacity_service import CapacityService


@pytest.mark.asyncio
async def test_item_capacity_sold_out(db_session: AsyncSession):
    # Setup Category, Item, and Capacity Rule (limit = 2)
    cat = MenuCategory(name="Pizzas", display_order=1)
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(
        category_id=cat.id,
        name="Pepperoni Pizza",
        price=Decimal("450.00"),
    )
    db_session.add(item)
    await db_session.flush()

    cap_rule = ItemCapacityRule(
        menu_item_id=item.id,
        max_production_limit=2,
        allocated_count=0,
    )
    db_session.add(cap_rule)
    await db_session.commit()

    # Allocate 2 pizzas
    await CapacityService.validate_and_allocate(db_session, item.id, 2)
    await db_session.commit()

    # Attempting to allocate 3rd pizza must raise PIZZA_SOLD_OUT exception
    with pytest.raises(HTTPException) as exc_info:
        await CapacityService.validate_and_allocate(db_session, item.id, 1)

    assert exc_info.value.status_code == 400
    assert "PIZZA_SOLD_OUT" in exc_info.value.detail
