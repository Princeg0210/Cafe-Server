from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.capacity import ItemCapacityRule
from app.models.menu import MenuItem


class CapacityService:
    @staticmethod
    async def validate_and_allocate(db: AsyncSession, menu_item_id: int, quantity: int) -> None:
        query = (
            select(ItemCapacityRule)
            .where(
                ItemCapacityRule.menu_item_id == menu_item_id,
                ItemCapacityRule.is_active == True,
            )
            .with_for_update()
        )
        result = await db.execute(query)
        rule = result.scalar_one_or_none()

        if rule:
            if rule.allocated_count + quantity > rule.max_production_limit:
                item_query = select(MenuItem).where(MenuItem.id == menu_item_id)
                item_res = await db.execute(item_query)
                item = item_res.scalar_one_or_none()
                item_name = item.name if item else f"Item #{menu_item_id}"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"PIZZA_SOLD_OUT: Production limit reached for '{item_name}'. Maximum capacity is {rule.max_production_limit}.",
                )
            rule.allocated_count += quantity

    @staticmethod
    async def get_item_capacity(db: AsyncSession, menu_item_id: int) -> dict:
        query = select(ItemCapacityRule).where(ItemCapacityRule.menu_item_id == menu_item_id)
        result = await db.execute(query)
        rule = result.scalar_one_or_none()
        if not rule:
            return {"is_sold_out": False, "allocated_count": 0, "max_production_limit": None}
        return {
            "is_sold_out": rule.allocated_count >= rule.max_production_limit,
            "allocated_count": rule.allocated_count,
            "max_production_limit": rule.max_production_limit,
        }
