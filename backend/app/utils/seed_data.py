import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import Base, engine, AsyncSessionLocal
from app.models.branch import Branch
from app.models.kitchen import Kitchen, MenuItemKitchenMapping
from app.models.table import Table, TableQR
from app.models.menu import MenuCategory, MenuItem

MENU_DATA = [
    {
        "category": "STARTERS & SMALL PLATES",
        "is_kitchen_1": True,
        "items": [
            ("ROSEMARY & GARLIC FOCACCIA", "House-baked rosemary focaccia with sea salt & roasted garlic oil dip", 300),
            ("CHEESE & WILD MUSHROOM TARTS", "Artisanal cheese & wild mushroom tartlets with fresh lettuce garnish", 400),
        ]
    },
    {
        "category": "OVEN-BAKED PASTA",
        "is_kitchen_1": True,
        "items": [
            ("TOMATO & RICOTTA CANNELLONI", "Ricotta & mozzarella stuffed pasta rolls baked in San Marzano passata", 500),
        ]
    },
    {
        "category": "WOOD-FIRED NEAPOLITAN PIZZAS",
        "is_kitchen_1": True,
        "items": [
            ("MARINARA CLASSICA", "San Marzano tomato sauce, roasted garlic, wild oregano, extra virgin olive oil", 400),
            ("MARGHERITA BUFALA", "San Marzano passata, Fior di Latte mozzarella, fresh basil leaves", 500),
            ("OLIVE & CAPERS", "San Marzano tomato base, Mediterranean olives, Sicilian capers, herb oil", 600),
            ("ZUCCHINI & PORTABELLO", "Shaved tender zucchini ribbons, earthy portobello mushrooms, garlic butter crust", 600),
            ("QUATTRO STAGIONI (FOUR SEASONS)", "Artichokes, portobello mushrooms, black olives, sweet bell peppers", 700),
            ("SOPHIA LOREN GOURMET", "Sundried tomatoes, pine nut pesto, wild rocket, Greek feta & mozzarella", 800),
            ("MARIA CALLAS ARTICHOKE", "Velvety feta cream base, artichoke hearts, sweet cherry tomatoes, pine pesto", 800),
            ("ITALA BROCCOLI CREAM", "Broccoli cream base, double mozzarella, salted capers, cherry tomatoes", 800),
            ("RESIDENCY UDAIPUR", "Feta cream, crispy green tomato fritters, pine nut pesto & wild rocket", 700),
        ]
    },
    {
        "category": "TRATTORIA DESSERTS",
        "is_kitchen_1": True,
        "items": [
            ("CLASSIC TIRAMISU", "Espresso-soaked ladyfingers, whipped mascarpone cream & dark cocoa", 250),
            ("COCONUT GELATO WITH BITTER ORANGE", "Organic coconut cream gelato topped with bitter orange glaze", 200),
        ]
    },
    {
        "category": "COLD DRINKS & KOMBUCHA",
        "is_kitchen_1": False,
        "items": [
            ("FRESH MINT LIMONATA", "Key lime juice, sparkling soda water, fresh garden mint", 100),
            ("SPARKLING LEMON GINGER", "House ginger reduction, fresh lemon juice, chilled soda water", 150),
            ("PEACH & LEMON ICED TEA", "Slow-brewed black tea infused with peach nectar & lemon zest", 150),
            ("ARTISANAL KOMBUCHA", "Botanical ferments: Lemongrass + Mint / Kokum / Pineapple + Rosemary", 250),
            ("HIMALAYAN NATURAL SPRING WATER", "Pure high-altitude spring water bottled at origin", 50),
        ]
    },
    {
        "category": "COFFEE & MOUNTAIN TISANES",
        "is_kitchen_1": False,
        "items": [
            ("DOUBLE ARABICA ESPRESSO", "Double shot 100% mountain Arabica roast with rich caramel crema", 150),
            ("HIMALAYAN RHODODENDRON & THYME TISANE", "Wild red rhododendron petals, garden mint & thyme", 150),
            ("ROSEHIP & SPEARMINT TISANE", "Vitamin C rich rosehip husks brewed with fragrant spearmint", 150),
            ("HIMALAYAN MIXED HERB INFUSION", "High-altitude botanical blend of tulsi, lemongrass, ginger & black pepper", 150),
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
                # Create active TableQR with qr_token matching table number (e.g. "1")
                qr = TableQR(table_id=tbl.id, qr_token=str(t_num), is_active=True)
                db.add(qr)

        # 4. Categories & Menu Items & Kitchen Routing
        disp_order = 1
        for cat_data in MENU_DATA:
            cat_res = await db.execute(select(MenuCategory).where(MenuCategory.name == cat_data["category"]))
            cat = cat_res.scalar_one_or_none()
            if not cat:
                cat = MenuCategory(name=cat_data["category"], display_order=disp_order)
                db.add(cat)
                await db.flush()
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

        await db.commit()
        print("Database seeded with Tables, TableQRs, MenuItems, and Dual-Kitchen Mappings successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
