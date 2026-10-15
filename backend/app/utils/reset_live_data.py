"""Clear guest and transaction data before going live, keeping the menu, inventory and setup.

Preview (changes nothing, only counts rows):
    python -m app.utils.reset_live_data

Delete for real (one transaction: all or nothing):
    python -m app.utils.reset_live_data --confirm "DELETE LIVE DATA"

Take a database backup first. There is no undo.
"""
import argparse
import asyncio

from sqlalchemy import text

from app.core.database import engine

# Guest and transaction data: emptied, and their ID counters restart at 1
CLEAR = [
    "customers",
    "reservations",
    "reservation_dough_allocations",
    "dining_sessions",
    "orders",
    "order_items",
    "order_status_history",
    "kitchen_orders",
    "print_jobs",
    "kots",
    "bills",
    "payments",
    "verified_bank_credits",
    "feedback",
    "notifications",
]

# Never touched (listed so the preview shows they survive)
KEEP = [
    "menu_categories", "menu_items", "menu_item_images", "recipes", "recipe_items",
    "inventory_items", "inventory_transactions", "suppliers", "purchase_orders", "purchase_order_items",
    "tables", "table_qr", "generalized_qrs", "users", "roles", "permissions", "role_permissions",
    "system_settings", "branches", "kitchens", "kitchen_printers", "menu_item_kitchen_mapping",
    "item_capacity_rules", "daily_production_rules", "reservation_capacity_rules", "audit_logs",
]

CONFIRM_PHRASE = "DELETE LIVE DATA"


async def count_rows(conn, tables):
    existing = set((await conn.execute(text("select tablename from pg_tables where schemaname = 'public'"))).scalars())
    return {t: (await conn.execute(text(f'select count(*) from "{t}"'))).scalar() if t in existing else None for t in tables}


def show(title, counts):
    print(f"\n{title}")
    for t, n in counts.items():
        print(f"  {t:<32} {'(table not found)' if n is None else n}")


async def main(confirm: str | None) -> None:
    async with engine.connect() as conn:
        show("WILL BE CLEARED:", await count_rows(conn, CLEAR))
        show("KEPT AS IS:", await count_rows(conn, KEEP))

    if confirm != CONFIRM_PHRASE:
        print(f'\nPreview only, nothing changed. To delete, run again with: --confirm "{CONFIRM_PHRASE}"')
        return

    async with engine.begin() as conn:  # one transaction: if anything fails, nothing is deleted
        present = [t for t, n in (await count_rows(conn, CLEAR)).items() if n is not None]
        # No CASCADE: if a kept table still pointed at these rows, Postgres refuses instead of deleting it too
        await conn.execute(text(f"TRUNCATE {', '.join(chr(34) + t + chr(34) for t in present)} RESTART IDENTITY"))
        await conn.execute(text("UPDATE tables SET status = 'Available'"))

    async with engine.connect() as conn:
        show("AFTER RESET, CLEARED TABLES:", await count_rows(conn, CLEAR))
        show("AFTER RESET, KEPT TABLES:", await count_rows(conn, KEEP))
    print("\nDone. All tables are Available; order, KOT and reservation numbers start again from 1.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--confirm", help=f'type exactly "{CONFIRM_PHRASE}" to delete')
    asyncio.run(main(parser.parse_args().confirm))
