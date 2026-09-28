import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.capacity import ItemCapacityRule
from app.models.menu import MenuItem
from app.models.reservation import Reservation
from app.services.settings_service import SettingsService


class CapacityService:
    @staticmethod
    async def validate_and_allocate(
        db: AsyncSession, menu_item_id: int, quantity: int, is_walk_in: bool = False
    ) -> None:
        """
        Validates pizza dough/item production limit.
        Guarantees that Reservation Capacity is separate from Production Capacity,
        while optionally protecting production dough for confirmed reservations.
        """
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
            # Check if dough demand protection is configured for reservations
            demand_ratio_str = await SettingsService.get_setting(
                db, "RESERVATION_PIZZA_DEMAND_RATIO", "0.0"
            )
            try:
                demand_ratio = float(demand_ratio_str)
            except Exception:
                demand_ratio = 0.0

            protected_demand = 0
            if is_walk_in and demand_ratio > 0.0:
                today = datetime.date.today()
                res_count_stmt = select(func.coalesce(func.sum(Reservation.guest_count), 0)).where(
                    Reservation.reservation_date == today,
                    Reservation.status.in_(["CONFIRMED", "ARRIVED"]),
                )
                res_count = (await db.execute(res_count_stmt)).scalar() or 0
                protected_demand = int(res_count * demand_ratio)

            effective_limit = rule.max_production_limit - (protected_demand if is_walk_in else 0)

            if rule.allocated_count + quantity > effective_limit:
                item_query = select(MenuItem).where(MenuItem.id == menu_item_id)
                item_res = await db.execute(item_query)
                item = item_res.scalar_one_or_none()
                item_name = item.name if item else f"Item #{menu_item_id}"

                reason = (
                    f"PIZZA_SOLD_OUT: Production limit reached for '{item_name}'. Maximum capacity is {rule.max_production_limit}."
                )
                if is_walk_in and protected_demand > 0:
                    reason += f" ({protected_demand} portions protected for confirmed reservations)."

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=reason,
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

    @staticmethod
    async def get_production_and_reservation_overview(
        db: AsyncSession, menu_item_id: int, target_date: Optional[datetime.date] = None
    ) -> dict:
        if not target_date:
            target_date = datetime.date.today()

        query = select(ItemCapacityRule).where(ItemCapacityRule.menu_item_id == menu_item_id)
        result = await db.execute(query)
        rule = result.scalar_one_or_none()

        res_stmt = select(func.coalesce(func.sum(Reservation.guest_count), 0)).where(
            Reservation.reservation_date == target_date,
            Reservation.status.in_(["CONFIRMED", "ARRIVED", "SEATED"]),
        )
        reserved_guests = (await db.execute(res_stmt)).scalar() or 0

        demand_ratio_str = await SettingsService.get_setting(db, "RESERVATION_PIZZA_DEMAND_RATIO", "0.0")
        try:
            demand_ratio = float(demand_ratio_str)
        except Exception:
            demand_ratio = 0.0

        protected_demand = int(reserved_guests * demand_ratio)
        max_limit = rule.max_production_limit if rule else 100
        allocated = rule.allocated_count if rule else 0
        walk_in_avail = max(0, max_limit - allocated - protected_demand)

        return {
            "menu_item_id": menu_item_id,
            "max_production_limit": max_limit,
            "allocated_count": allocated,
            "reserved_guests": reserved_guests,
            "protected_reservation_demand": protected_demand,
            "walk_in_available": walk_in_avail,
        }
