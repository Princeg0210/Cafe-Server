import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.table import Table, TableQR
from app.models.branch import Branch

logger = logging.getLogger("cafe_piza.init_tables")

DEFAULT_TABLES = [
    {"id": 1, "table_number": "Table 1", "capacity": 4, "qr_token": "qr_sec_b7ba9c59d35e4074a30034abb48ee0a9"},
    {"id": 2, "table_number": "Table 2", "capacity": 4, "qr_token": "qr_sec_c2a8e419f72b491295e865f12a14e9b2"},
    {"id": 3, "table_number": "Table 3", "capacity": 2, "qr_token": "qr_sec_8d1a3b5c7e9f02468ace13579bdf2468"},
    {"id": 4, "table_number": "Table 4", "capacity": 4, "qr_token": "qr_sec_9e2b4c6d8f0a13579bdf2468ace13579"},
    {"id": 5, "table_number": "Table 5", "capacity": 6, "qr_token": "qr_sec_0f3c5d7e9a1b2468ace13579bdf2468a"},
    {"id": 6, "table_number": "Table 6", "capacity": 4, "qr_token": "qr_sec_1a4d6e8f0b2c3579bdf2468ace13579b"},
    {"id": 7, "table_number": "Table 7", "capacity": 4, "qr_token": "qr_sec_2b5e7f9a1c3d468ace13579bdf2468ac"},
    {"id": 8, "table_number": "Table 8", "capacity": 4, "qr_token": "qr_sec_3c6f8a0b2d4e579bdf2468ace13579bd"},
    {"id": 9, "table_number": "Table 9", "capacity": 4, "qr_token": "qr_sec_4d7a9b1c3e5f68ace13579bdf2468ace"},
    {"id": 10, "table_number": "Table 10", "capacity": 4, "qr_token": "qr_sec_5e8b0c2d4f6a79bdf2468ace13579bdf"},
    {"id": 11, "table_number": "Table 11", "capacity": 4, "qr_token": "qr_sec_6f9c1d3e5a7b8ace13579bdf2468ace1"},
    {"id": 12, "table_number": "Table 12", "capacity": 4, "qr_token": "qr_sec_7a0d2e4f6b8c9bdf2468ace13579bdf2"},
]


async def ensure_default_tables(db: AsyncSession) -> None:
    """
    Idempotently ensures default tables (1 to 12) and their secure TableQR tokens
    exist in the database across all environments (Render / Local).
    """
    branch_res = await db.execute(select(Branch))
    branch = branch_res.scalar_one_or_none()
    if not branch:
        branch = Branch(name="Jaadoo Udaipur", address="Chandpole, Udaipur", phone="+919876543210")
        db.add(branch)
        await db.flush()

    for dt in DEFAULT_TABLES:
        # Check if table exists by ID or by table_number
        tbl_res = await db.execute(
            select(Table).where((Table.id == dt["id"]) | (Table.table_number == dt["table_number"]))
        )
        tbl = tbl_res.scalar_one_or_none()

        if not tbl:
            tbl = Table(
                id=dt["id"],
                branch_id=branch.id,
                table_number=dt["table_number"],
                capacity=dt["capacity"],
                status="Available",
            )
            db.add(tbl)
            await db.flush()

        # Check if TableQR exists for this table
        qr_res = await db.execute(select(TableQR).where(TableQR.table_id == tbl.id))
        qr = qr_res.scalar_one_or_none()

        if not qr:
            # Also check if token is taken
            token_res = await db.execute(select(TableQR).where(TableQR.qr_token == dt["qr_token"]))
            if not token_res.scalar_one_or_none():
                qr = TableQR(table_id=tbl.id, qr_token=dt["qr_token"], is_active=True)
                db.add(qr)
        else:
            if not qr.is_active:
                qr.is_active = True

    await db.commit()
    logger.info("Default tables and secure TableQR tokens ensured.")
