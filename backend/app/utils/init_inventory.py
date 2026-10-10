import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.inventory import InventoryItem

logger = logging.getLogger("cafe_piza.init_inventory")

# Raw materials used across the menu: (sku, name, unit_of_measure, reorder_threshold).
# Seeded with zero stock; the owner records opening stock and purchases from Admin > Inventory.
RAW_MATERIALS = [
    # Pizza dough & baking
    ("RM-FLOUR-00", "00 Pizza Flour", "kg", 25),
    ("RM-FLOUR-AP", "All-Purpose Flour (Pastry & Focaccia)", "kg", 5),
    ("RM-YEAST", "Dry Yeast", "kg", 0.5),
    ("RM-SALT", "Sea Salt", "kg", 2),
    ("RM-SUGAR", "Sugar", "kg", 3),
    ("RM-OLIVE-OIL", "Extra Virgin Olive Oil", "l", 5),
    ("RM-BUTTER", "Butter", "kg", 2),
    ("RM-EGGS", "Free-Range Eggs", "pcs", 30),
    ("RM-CANNELLONI", "Cannelloni Pasta Tubes", "kg", 2),
    ("RM-FIREWOOD", "Firewood (Wood-Fired Oven)", "kg", 50),
    # Sauces & pantry
    ("RM-TOMATO-PEELED", "Peeled Tomatoes (Pizza Sauce)", "kg", 10),
    ("RM-GARLIC", "Garlic", "kg", 1),
    ("RM-OREGANO", "Dried Oregano", "kg", 0.25),
    ("RM-CAPERS", "Capers", "kg", 1),
    ("RM-OLIVES", "Olives", "kg", 1),
    ("RM-SUNDRIED-TOMATO", "Sundried Tomatoes", "kg", 1),
    ("RM-ARTICHOKE", "Artichoke Hearts", "kg", 1),
    ("RM-PESTO", "Basil Pesto", "kg", 1),
    # Fresh vegetables & herbs
    ("RM-BASIL", "Fresh Basil", "kg", 0.5),
    ("RM-ZUCCHINI", "Zucchini", "kg", 2),
    ("RM-MUSHROOM", "Mushrooms", "kg", 2),
    ("RM-CAPSICUM-RED", "Red Capsicum", "kg", 1),
    ("RM-CAPSICUM-YELLOW", "Yellow Capsicum", "kg", 1),
    ("RM-CHERRY-TOMATO", "Cherry Tomatoes", "kg", 1),
    ("RM-GREEN-TOMATO", "Green Tomatoes", "kg", 1),
    ("RM-ROCKET", "Rocket Leaves", "kg", 0.5),
    ("RM-BROCCOLI", "Broccoli", "kg", 1),
    ("RM-LETTUCE", "Lettuce", "kg", 0.5),
    ("RM-MINT", "Fresh Mint", "kg", 0.25),
    ("RM-GINGER", "Ginger", "kg", 0.5),
    ("RM-LIME", "Limes / Lemons", "kg", 2),
    ("RM-ORANGE", "Bitter Oranges", "kg", 1),
    # Dairy
    ("RM-MOZZARELLA", "Mozzarella", "kg", 5),
    ("RM-FETA", "Feta Cheese", "kg", 2),
    ("RM-RICOTTA", "Ricotta (Cannelloni Filling)", "kg", 1),
    ("RM-MASCARPONE", "Mascarpone", "kg", 1),
    ("RM-CREAM", "Fresh Cream", "l", 2),
    # Desserts
    ("RM-LADYFINGERS", "Ladyfinger Biscuits", "kg", 1),
    ("RM-COCOA", "Cocoa Powder", "kg", 0.25),
    ("RM-COCONUT-MILK", "Coconut Milk", "l", 2),
    # Coffee, tea & tisanes
    ("RM-COFFEE-BEANS", "Espresso Coffee Beans", "kg", 1),
    ("RM-BLACK-TEA", "Black Tea Leaves", "kg", 0.25),
    ("RM-PEACH-SYRUP", "Peach Syrup", "l", 0.5),
    ("RM-TISANE-RHODO", "Rhododendron Mint & Thyme Tisane", "kg", 0.2),
    ("RM-TISANE-ROSEHIP", "Himalayan Rosehip & Mint Tisane", "kg", 0.2),
    ("RM-TISANE-HERBS", "Himalayan Mixed Herbs Tisane", "kg", 0.2),
    # Bottled & packaged drinks
    ("RM-SODA", "Soda Water", "pcs", 24),
    ("RM-COKE", "Coke", "pcs", 24),
    ("RM-WATER", "Himalayan Mineral Water", "pcs", 24),
    ("RM-KOMBUCHA", "Kombucha", "pcs", 12),
]


async def ensure_raw_materials(db: AsyncSession) -> None:
    """Insert any missing raw materials by SKU. Never touches existing rows or stock levels."""
    existing = set((await db.execute(select(InventoryItem.sku))).scalars().all())
    missing = [m for m in RAW_MATERIALS if m[0] not in existing]
    for sku, name, unit, threshold in missing:
        db.add(InventoryItem(sku=sku, name=name, unit_of_measure=unit, current_stock=0, reorder_threshold=threshold))
    if missing:
        await db.commit()
        logger.info(f"Seeded {len(missing)} raw materials into inventory.")
