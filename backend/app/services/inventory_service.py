from decimal import Decimal
from typing import List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.inventory import InventoryItem, InventoryTransaction, Recipe, RecipeItem


class InventoryService:
    @staticmethod
    async def validate_bom_stock(db: AsyncSession, menu_item_id: int, order_qty: int) -> List[Tuple[InventoryItem, Decimal]]:
        # Find recipe for menu item
        recipe_query = select(Recipe).where(Recipe.menu_item_id == menu_item_id)
        recipe_res = await db.execute(recipe_query)
        recipe = recipe_res.scalar_one_or_none()

        if not recipe:
            return []

        # Find recipe items
        items_query = select(RecipeItem, InventoryItem).join(
            InventoryItem, RecipeItem.inventory_item_id == InventoryItem.id
        ).where(RecipeItem.recipe_id == recipe.id).with_for_update()
        
        items_res = await db.execute(items_query)
        recipe_items = items_res.all()

        deductions = []
        for recipe_item, inv_item in recipe_items:
            needed_qty = Decimal(str(recipe_item.quantity_required)) * Decimal(str(order_qty))
            if inv_item.current_stock < needed_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"INSUFFICIENT_STOCK: Raw ingredient '{inv_item.name}' stock ({inv_item.current_stock} {inv_item.unit_of_measure}) is insufficient for required quantity ({needed_qty} {inv_item.unit_of_measure}).",
                )
            deductions.append((inv_item, needed_qty))
        return deductions

    @staticmethod
    async def deduct_bom_stock(db: AsyncSession, menu_item_id: int, order_qty: int, order_number: str) -> None:
        deductions = await InventoryService.validate_bom_stock(db, menu_item_id, order_qty)
        for inv_item, needed_qty in deductions:
            inv_item.current_stock -= needed_qty
            tx = InventoryTransaction(
                inventory_item_id=inv_item.id,
                transaction_type="SALE_CONSUMPTION",
                quantity_change=-needed_qty,
                reference_id=f"ORDER-{order_number}",
            )
            db.add(tx)

    @staticmethod
    async def record_transaction(
        db: AsyncSession,
        inventory_item_id: int,
        transaction_type: str,
        quantity_change: Decimal,
        reference_id: str | None = None,
    ) -> InventoryTransaction:
        query = select(InventoryItem).where(InventoryItem.id == inventory_item_id).with_for_update()
        res = await db.execute(query)
        inv_item = res.scalar_one_or_none()

        if not inv_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item #{inventory_item_id} not found.",
            )

        inv_item.current_stock += quantity_change
        tx = InventoryTransaction(
            inventory_item_id=inventory_item_id,
            transaction_type=transaction_type,
            quantity_change=quantity_change,
            reference_id=reference_id,
        )
        db.add(tx)
        await db.commit()
        await db.refresh(tx)
        return tx
