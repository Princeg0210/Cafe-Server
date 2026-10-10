import asyncio
import os
import sys
from decimal import Decimal
from sqlalchemy import select, text
from app.core.database import Base, engine, AsyncSessionLocal
from app.models.branch import Branch
from app.models.kitchen import Kitchen, MenuItemKitchenMapping
from app.models.menu import MenuCategory, MenuItem
from app.models.capacity import ItemCapacityRule

# Master Configuration: Exact 6 Categories and 24 Menu Items
CATEGORIES_CONFIG = [
    {"id": 1, "name": "STARTERS", "display_order": 1},
    {"id": 2, "name": "PRIMO", "display_order": 2},
    {"id": 3, "name": "WOOD-FIRED NEAPOLITAN PIZZAS", "display_order": 3},
    {"id": 4, "name": "CAKES", "display_order": 4},
    {"id": 5, "name": "BEVERAGES", "display_order": 5},
    {"id": 6, "name": "HOT DRINKS", "display_order": 6},
]

MENU_ITEMS_CONFIG = [
    # Starters (Category 1)
    {"id": 1, "category_id": 1, "name": "FOCACCIA WITH GARLIC DIP", "description": "", "price": Decimal("300")},
    {"id": 2, "category_id": 1, "name": "CHEESE & MUSHROOM TARTS (2 PCS)", "description": "with lettuce garnish", "price": Decimal("400")},
    # Primo (Category 2)
    {"id": 3, "category_id": 2, "name": "CANNELLONI (CHEESE & TOMATO)", "description": "", "price": Decimal("500")},
    # Pizzas (Category 3)
    {"id": 4, "category_id": 3, "name": "MARINARA", "description": "tomato sauce w/garlic, basil, oregano, capers", "price": Decimal("400")},
    {"id": 5, "category_id": 3, "name": "MARGHERITA", "description": "tomato sauce w/garlic, basil, oregano, capers", "price": Decimal("500")},
    {"id": 6, "category_id": 3, "name": "OLIVE CAPERS", "description": "tomato sauce w/garlic, basil, oregano, capers", "price": Decimal("600")},
    {"id": 7, "category_id": 3, "name": "ZUCCHINI MUSHROOMS", "description": "", "price": Decimal("600")},
    {"id": 8, "category_id": 3, "name": "QUATRO STAGIONE", "description": "zucchini, mushroom, olives, red & yellow capsicum", "price": Decimal("700")},
    {"id": 9, "category_id": 3, "name": "SOPHIA LOREN", "description": "sundried tomatoes, pesto, capers, rocket, feta + mozzarella", "price": Decimal("800")},
    {"id": 10, "category_id": 3, "name": "MARIA CALLAS", "description": "feta cream base, artichoke hearts, pesto, cherry tomatoes", "price": Decimal("800")},
    {"id": 11, "category_id": 3, "name": "ITALA", "description": "mozzarella cheese base, broccoli cream, cherry tomatoes, capers", "price": Decimal("800")},
    {"id": 12, "category_id": 3, "name": "RESIDENCY UDAIPUR", "description": "feta cream base w fried green tomatoes, capers, rocket and pesto", "price": Decimal("700")},
    # Cakes (Category 4)
    {"id": 13, "category_id": 4, "name": "CLASSIC TIRAMISU", "description": "contains free-range eggs", "price": Decimal("250")},
    {"id": 14, "category_id": 4, "name": "COCONUT ICE CREAM WITH BITTER ORANGE SAUCE", "description": "Coconut ice cream served with bitter orange sauce", "price": Decimal("200")},
    # Beverages (Category 5)
    {"id": 15, "category_id": 5, "name": "FRESH LIME SODA", "description": "Key lime juice, sparkling soda water, fresh garden mint", "price": Decimal("100")},
    {"id": 16, "category_id": 5, "name": "LEMON GINGER SODA", "description": "House ginger reduction, fresh lemon juice, chilled soda water", "price": Decimal("150")},
    {"id": 17, "category_id": 5, "name": "ICE TEA", "description": "Lemon & Peach flavour", "price": Decimal("150")},
    {"id": 18, "category_id": 5, "name": "KOMBUCHA", "description": "with raw fruits: Lemongrass + mint, Kokum, Pineapple + rosemary, or Pomegranate", "price": Decimal("250")},
    {"id": 19, "category_id": 5, "name": "HIMALAYAN MINERAL WATER", "description": "Pure mineral water bottled at origin", "price": Decimal("50")},
    # Hot Drinks (Category 6)
    {"id": 20, "category_id": 6, "name": "ESPRESSO", "description": "100% mountain Arabica roast with rich crema", "price": Decimal("150")},
    {"id": 21, "category_id": 6, "name": "RHODODENDRON MINT & THYME TISANE", "description": "Wild red rhododendron petals, garden mint & thyme", "price": Decimal("150")},
    {"id": 22, "category_id": 6, "name": "HIMALAYAN ROSEHIP & MINT TISANE", "description": "Rosehip husks brewed with fragrant mint", "price": Decimal("150")},
    {"id": 23, "category_id": 6, "name": "HIMALAYAN MIXED HERBS", "description": "High-altitude botanical blend of tulsi, lemongrass, ginger & black pepper", "price": Decimal("150")},
    # Beverages (Category 5)
    {"id": 24, "category_id": 5, "name": "COKE", "description": "Chilled classic Coca-Cola", "price": Decimal("100")},
]

async def sync_menu(db_session=None):
    close_session = False
    if db_session is None:
        db = AsyncSessionLocal()
        close_session = True
    else:
        db = db_session

    try:
        # 1. Ensure branch exists
        branch_res = await db.execute(select(Branch).where(Branch.id == 1))
        branch = branch_res.scalar_one_or_none()
        if not branch:
            branch = Branch(id=1, name="Jaadoo Udaipur", address="Chandpole, Udaipur", phone="+919876543210")
            db.add(branch)
            await db.flush()

        # 2. Single Real Kitchen (Kitchen 1: Hot Food Kitchen)
        # Note: All items in cafe are prepared in this single real kitchen station.
        k_res = await db.execute(select(Kitchen).where(Kitchen.id == 1))
        kitchen1 = k_res.scalar_one_or_none()
        if not kitchen1:
            kitchen1 = Kitchen(id=1, branch_id=branch.id, name="Hot Food Kitchen")
            db.add(kitchen1)
            await db.flush()

        # 3. Upsert Categories (Preserve or create IDs 1..6)
        for cat_data in CATEGORIES_CONFIG:
            cat_res = await db.execute(select(MenuCategory).where(MenuCategory.id == cat_data["id"]))
            cat = cat_res.scalar_one_or_none()
            if not cat:
                cat = MenuCategory(
                    id=cat_data["id"],
                    name=cat_data["name"],
                    display_order=cat_data["display_order"],
                    is_active=True,
                )
                db.add(cat)
            else:
                cat.name = cat_data["name"]
                cat.display_order = cat_data["display_order"]
                cat.is_active = True
        await db.flush()

        # 4. Upsert Menu Items (Preserve or create IDs 1..24)
        for item_data in MENU_ITEMS_CONFIG:
            item_res = await db.execute(select(MenuItem).where(MenuItem.id == item_data["id"]))
            item = item_res.scalar_one_or_none()
            if not item:
                item = MenuItem(
                    id=item_data["id"],
                    category_id=item_data["category_id"],
                    name=item_data["name"],
                    description=item_data["description"],
                    price=item_data["price"],
                    tax_rate=Decimal("5.00"),
                    is_available=True,
                    is_active=True,
                )
                db.add(item)
            else:
                item.category_id = item_data["category_id"]
                item.name = item_data["name"]
                item.description = item_data["description"]
                item.price = item_data["price"]
                item.tax_rate = Decimal("5.00")
                item.is_available = True
                item.is_active = True
        await db.flush()

        # 5. Single Kitchen Routing (Map all 24 items to Kitchen 1)
        for item_data in MENU_ITEMS_CONFIG:
            m_res = await db.execute(
                select(MenuItemKitchenMapping).where(MenuItemKitchenMapping.menu_item_id == item_data["id"])
            )
            mapping = m_res.scalar_one_or_none()
            if not mapping:
                mapping = MenuItemKitchenMapping(menu_item_id=item_data["id"], kitchen_id=kitchen1.id)
                db.add(mapping)
            else:
                mapping.kitchen_id = kitchen1.id
        await db.flush()

        # 6. Item Capacity Rules (Ensure production limit is configured for each item)
        for item_data in MENU_ITEMS_CONFIG:
            r_res = await db.execute(
                select(ItemCapacityRule).where(ItemCapacityRule.menu_item_id == item_data["id"])
            )
            rule = r_res.scalar_one_or_none()
            if not rule:
                rule = ItemCapacityRule(
                    menu_item_id=item_data["id"],
                    max_production_limit=50,
                    allocated_count=0,
                    reset_period="DAILY",
                    is_active=True,
                )
                db.add(rule)
            else:
                rule.max_production_limit = 50
                rule.is_active = True
                # Preserve existing allocated_count so active sessions aren't corrupted
        await db.flush()

        # 7. If running on PostgreSQL, synchronize sequence values
        is_postgres = False
        try:
            bind = db.get_bind()
            if "postgresql" in str(bind.dialect.name).lower():
                is_postgres = True
        except Exception:
            pass

        if is_postgres:
            await db.execute(text("SELECT setval('menu_categories_id_seq', (SELECT max(id) FROM menu_categories));"))
            await db.execute(text("SELECT setval('menu_items_id_seq', (SELECT max(id) FROM menu_items));"))
            try:
                await db.execute(text("SELECT setval('menu_item_kitchen_mapping_id_seq', (SELECT max(id) FROM menu_item_kitchen_mapping));"))
            except Exception:
                pass
            try:
                await db.execute(text("SELECT setval('item_capacity_rules_id_seq', (SELECT max(id) FROM item_capacity_rules));"))
            except Exception:
                pass

        await db.commit()
        print("Menu configuration synchronized successfully (Idempotent: 6 categories, 24 items, Kitchen 1 mapping, Capacity rules).")
    finally:
        if close_session:
            await db.close()

if __name__ == "__main__":
    asyncio.run(sync_menu())
