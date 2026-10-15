"""With INVENTORY_AUTO_DEDUCT off (the default), orders never touch stock or get blocked by it."""
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.models.branch import Branch
from app.models.inventory import InventoryItem, InventoryTransaction, Recipe, RecipeItem
from app.models.kitchen import Kitchen
from app.models.menu import MenuCategory, MenuItem
from app.models.table import Table, TableQR


@pytest.mark.asyncio
async def test_orders_do_not_deduct_or_block_on_stock(db_session, client: AsyncClient):
    branch = Branch(id=70, name="Stock Branch", address="Udaipur", phone="+919351322209")
    db_session.add(branch)
    await db_session.flush()
    db_session.add(Kitchen(branch_id=branch.id, name="Main Kitchen"))
    cat = MenuCategory(name="BEVERAGES", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    coffee = MenuItem(category_id=cat.id, name="Espresso", price=Decimal("150.00"))
    beans = InventoryItem(sku="SKU-BEANS", name="Beans", unit_of_measure="g", current_stock=Decimal("10"), reorder_threshold=Decimal("1"))
    table = Table(branch_id=branch.id, table_number="Table 1", capacity=4, status="Available")
    db_session.add_all([coffee, beans, table])
    await db_session.flush()
    recipe = Recipe(menu_item_id=coffee.id, name="Espresso")
    db_session.add(recipe)
    await db_session.flush()
    db_session.add(RecipeItem(recipe_id=recipe.id, inventory_item_id=beans.id, quantity_required=Decimal("20")))  # needs 20g, only 10g in stock
    db_session.add(TableQR(table_id=table.id, qr_token="qr-stock-01"))
    await db_session.commit()
    table_id, coffee_id, beans_id = table.id, coffee.id, beans.id

    res = await client.post(f"/api/v1/pos/tables/{table_id}/orders", json={"items": [{"menu_item_id": coffee_id, "quantity": 2}]})
    assert res.status_code == 201, res.text  # not refused for "insufficient stock"

    db_session.expire_all()
    assert (await db_session.get(InventoryItem, beans_id)).current_stock == Decimal("10")
    assert (await db_session.execute(select(func.count(InventoryTransaction.id)))).scalar() == 0
