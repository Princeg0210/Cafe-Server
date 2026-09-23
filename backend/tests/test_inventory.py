import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.menu import MenuCategory, MenuItem
from app.models.inventory import InventoryItem, Recipe, RecipeItem, InventoryTransaction
from app.services.inventory_service import InventoryService


@pytest.mark.asyncio
async def test_bom_inventory_transaction_rollback(db_session: AsyncSession):
    # Setup inventory items: Flour (stock = 5kg), Cheese (stock = 0.1kg)
    flour = InventoryItem(sku="SKU-FLOUR", name="Flour", unit_of_measure="kg", current_stock=Decimal("5.0000"), reorder_threshold=Decimal("1.0000"))
    cheese = InventoryItem(sku="SKU-CHEESE", name="Cheese", unit_of_measure="kg", current_stock=Decimal("0.1000"), reorder_threshold=Decimal("0.5000"))
    db_session.add_all([flour, cheese])
    await db_session.flush()

    cat = MenuCategory(name="Pizzas")
    db_session.add(cat)
    await db_session.flush()

    item = MenuItem(category_id=cat.id, name="Cheese Pizza", price=Decimal("350.00"))
    db_session.add(item)
    await db_session.flush()

    # Recipe requires 0.5kg flour and 0.3kg cheese per pizza
    recipe = Recipe(menu_item_id=item.id, name="Cheese Pizza Recipe")
    db_session.add(recipe)
    await db_session.flush()

    r_item1 = RecipeItem(recipe_id=recipe.id, inventory_item_id=flour.id, quantity_required=Decimal("0.5000"))
    r_item2 = RecipeItem(recipe_id=recipe.id, inventory_item_id=cheese.id, quantity_required=Decimal("0.3000"))
    db_session.add_all([r_item1, r_item2])
    await db_session.commit()
    flour_id = flour.id

    # Attempt to order 1 pizza -> Cheese is insufficient (0.1kg < 0.3kg) -> raises HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await InventoryService.deduct_bom_stock(db_session, item.id, 1, "ORD-FAIL-101")

    assert exc_info.value.status_code == 400
    assert "INSUFFICIENT_STOCK" in exc_info.value.detail

    # Verify that Flour stock was NOT deducted (stock remains 5.0000) and 0 transactions recorded
    await db_session.rollback()
    flour_res = await db_session.execute(select(InventoryItem).where(InventoryItem.id == flour_id))
    reloaded_flour = flour_res.scalar_one()
    assert reloaded_flour.current_stock == Decimal("5.0000")

    tx_res = await db_session.execute(select(InventoryTransaction))
    txs = tx_res.scalars().all()
    assert len(txs) == 0
