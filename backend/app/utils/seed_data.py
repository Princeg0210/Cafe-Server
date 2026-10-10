import asyncio
import secrets
from decimal import Decimal
from sqlalchemy import select
from app.core.database import Base, engine, AsyncSessionLocal
from app.models.branch import Branch
from app.models.kitchen import Kitchen, MenuItemKitchenMapping
from app.models.table import Table, TableQR
from app.models.menu import MenuCategory, MenuItem
from app.utils.create_pos_user import ensure_default_users

MENU_DATA = [
    {
        "category": "STARTERS",
        "is_kitchen_1": True,
        "items": [
            ("FOCACCIA WITH GARLIC DIP", "", 300),
            ("CHEESE & MUSHROOM TARTS (2 PCS)", "with lettuce garnish", 400),
        ]
    },
    {
        "category": "PRIMO",
        "is_kitchen_1": True,
        "items": [
            ("CANNELLONI (CHEESE & TOMATO)", "", 500),
        ]
    },
    {
        "category": "PIZZA",
        "is_kitchen_1": True,
        "items": [
            ("MARINARA", "tomato sauce w/garlic, basil, oregano, capers", 400),
            ("MARGHERITA", "tomato sauce w/garlic, basil, oregano, capers", 500),
            ("OLIVE CAPERS", "tomato sauce w/garlic, basil, oregano, capers", 600),
            ("ZUCCHINI MUSHROOMS", "", 600),
            ("QUATRO STAGIONE", "zucchini, mushroom, olives, red & yellow capsicum", 700),
            ("SOPHIA LOREN", "sundried tomatoes, pesto, capers, rocket, feta + mozzarella", 800),
            ("MARIA CALLAS", "feta cream base, artichoke hearts, pesto, cherry tomatoes", 800),
            ("ITALA", "mozzarella cheese base, broccoli cream, cherry tomatoes, capers", 800),
            ("RESIDENCY UDAIPUR", "feta cream base w fried green tomatoes, capers, rocket and pesto", 700),
        ]
    },
    {
        "category": "CAKES",
        "is_kitchen_1": True,
        "items": [
            ("CLASSIC TIRAMISU", "contains free-range eggs", 250),
            ("COCONUT ICE CREAM WITH BITTER ORANGE SAUCE", "", 200),
        ]
    },
    {
        "category": "BEVERAGES",
        "is_kitchen_1": False,
        "items": [
            ("FRESH LIME SODA", "", 100),
            ("LEMON GINGER SODA", "", 150),
            ("COKE", "", 100),
            ("HIMALAYAN MINERAL WATER", "", 50),
            ("ICE TEA", "Lemon & Peach flavour", 150),
            ("KOMBUCHA", "with raw fruits: Lemongrass + mint, Kokum, Pineapple + rosemary, or Pomegranate", 250),
        ]
    },
    {
        "category": "HOT DRINKS",
        "is_kitchen_1": False,
        "items": [
            ("ESPRESSO", "", 150),
            ("RHODODENDRON MINT & THYME TISANE", "", 150),
            ("HIMALAYAN ROSEHIP & MINT TISANE", "", 150),
            ("HIMALAYAN MIXED HERBS", "", 150),
        ]
    }
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        # 1. Branch
        branch_res = await db.execute(select(Branch).where(Branch.id == 1))
        branch = branch_res.scalar_one_or_none()
        if not branch:
            branch = Branch(id=1, name="Jaadoo Main", address="Chandpole, Old City Udaipur", phone="+919876543210")
            db.add(branch)
            await db.flush()

        # 2. Kitchens
        k1_res = await db.execute(select(Kitchen).where(Kitchen.name == "Hot Food Kitchen"))
        k1 = k1_res.scalar_one_or_none()
        if not k1:
            k1 = Kitchen(branch_id=branch.id, name="Hot Food Kitchen")
            db.add(k1)
            await db.flush()

        k2_res = await db.execute(select(Kitchen).where(Kitchen.name == "Bar & Beverage"))
        k2 = k2_res.scalar_one_or_none()
        if not k2:
            k2 = Kitchen(branch_id=branch.id, name="Bar & Beverage")
            db.add(k2)
            await db.flush()

        # 3. Tables 1 through 12
        for t_num in range(1, 13):
            t_str = f"T-{str(t_num).zfill(2)}"
            t_res = await db.execute(select(Table).where(Table.table_number == t_str))
            tbl = t_res.scalar_one_or_none()
            if not tbl:
                tbl = Table(branch_id=branch.id, table_number=t_str, capacity=4, status="Available")
                db.add(tbl)
                await db.flush()
                # Create active TableQR with secure opaque qr_token
                qr = TableQR(table_id=tbl.id, qr_token=f"qr_sec_{secrets.token_urlsafe(32)}", is_active=True)
                db.add(qr)

        # Category name migrations map
        CAT_MIGRATION = {
            "STARTERS & SMALL PLATES": "STARTERS",
            "OVEN-BAKED PASTA": "PRIMO",
            "TRATTORIA DESSERTS": "CAKES",
            "COLD DRINKS & KOMBUCHA": "BEVERAGES",
            "COFFEE & MOUNTAIN TISANES": "HOT DRINKS",
        }
        for old_cat_name, new_cat_name in CAT_MIGRATION.items():
            old_cat_res = await db.execute(select(MenuCategory).where(MenuCategory.name == old_cat_name))
            old_cat = old_cat_res.scalar_one_or_none()
            if old_cat:
                old_cat.name = new_cat_name

        # Item name migrations map
        ITEM_MIGRATION = {
            "ROSEMARY & GARLIC FOCACCIA": "FOCACCIA WITH GARLIC DIP",
            "CHEESE & WILD MUSHROOM TARTS": "CHEESE & MUSHROOM TARTS (2 PCS)",
            "TOMATO & RICOTTA CANNELLONI": "CANNELLONI (CHEESE & TOMATO)",
            "COCONUT GELATO WITH BITTER ORANGE": "COCONUT ICE CREAM WITH BITTER ORANGE SAUCE",
            "FRESH MINT LIMONATA": "FRESH LIME SODA",
            "PEACH & LEMON ICED TEA": "ICE TEA",
            "HIMALAYAN NATURAL SPRING WATER": "HIMALAYAN MINERAL WATER",
            "DOUBLE ARABICA ESPRESSO": "ESPRESSO",
            "HIMALAYAN RHODODENDRON & THYME TISANE": "RHODODENDRON MINT & THYME TISANE",
            "ROSEHIP & SPEARMINT TISANE": "HIMALAYAN ROSEHIP & MINT TISANE",
            "HIMALAYAN MIXED HERB INFUSION": "HIMALAYAN MIXED HERBS",
        }
        for old_item_name, new_item_name in ITEM_MIGRATION.items():
            old_item_res = await db.execute(select(MenuItem).where(MenuItem.name == old_item_name))
            old_item = old_item_res.scalar_one_or_none()
            if old_item:
                old_item.name = new_item_name

        await db.flush()

        # 4. Categories & Menu Items & Kitchen Routing
        disp_order = 1
        for cat_data in MENU_DATA:
            cat_res = await db.execute(select(MenuCategory).where(MenuCategory.name == cat_data["category"]))
            cat = cat_res.scalar_one_or_none()
            if not cat:
                cat = MenuCategory(name=cat_data["category"], display_order=disp_order)
                db.add(cat)
                await db.flush()
            else:
                cat.display_order = disp_order
            disp_order += 1

            target_kitchen = k1 if cat_data["is_kitchen_1"] else k2

            for item_name, desc, price in cat_data["items"]:
                item_res = await db.execute(select(MenuItem).where(MenuItem.name == item_name))
                item = item_res.scalar_one_or_none()
                if not item:
                    item = MenuItem(
                        category_id=cat.id,
                        name=item_name,
                        description=desc,
                        price=Decimal(str(price)),
                        is_available=True,
                        is_active=True,
                    )
                    db.add(item)
                    await db.flush()

                    mapping = MenuItemKitchenMapping(menu_item_id=item.id, kitchen_id=target_kitchen.id)
                    db.add(mapping)
                else:
                    item.category_id = cat.id
                    item.description = desc
                    item.price = Decimal(str(price))
                    item.is_available = True
                    item.is_active = True
                    
                    # Ensure kitchen mapping exists
                    map_res = await db.execute(select(MenuItemKitchenMapping).where(MenuItemKitchenMapping.menu_item_id == item.id))
                    mapping = map_res.scalar_one_or_none()
                    if not mapping:
                        mapping = MenuItemKitchenMapping(menu_item_id=item.id, kitchen_id=target_kitchen.id)
                        db.add(mapping)
                    else:
                        mapping.kitchen_id = target_kitchen.id

        await db.commit()
        await ensure_default_users()
        print("Database seeded and synced with exact menu items, dual-kitchen mappings, and POS cashier user successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
