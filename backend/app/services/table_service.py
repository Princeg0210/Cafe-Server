import secrets
import uuid
import datetime
from typing import Optional, List
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.table import Table, TableQR, DiningSession
from app.models.order import Order
from app.schemas.table import (
    QRValidateResponse,
    DiningSessionResponse,
    SessionBillResponse,
    SessionBillItemResponse,
)


class TableService:
    @staticmethod
    async def rotate_qr_token(db: AsyncSession, table_id: int) -> TableQR:
        table = await db.get(Table, table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

        # Fetch existing TableQR for this table if it exists
        qr_stmt = select(TableQR).where(TableQR.table_id == table_id)
        qr_res = await db.execute(qr_stmt)
        qr = qr_res.scalar_one_or_none()

        new_token = f"qr_sec_{secrets.token_urlsafe(32)}"
        if qr:
            qr.qr_token = new_token
            qr.is_active = True
        else:
            qr = TableQR(table_id=table_id, qr_token=new_token, is_active=True)
            db.add(qr)

        await db.commit()
        await db.refresh(qr)
        return qr


    @staticmethod
    async def get_or_create_dining_session(db: AsyncSession, table_id: int) -> DiningSession:
        """
        Triple-Layer Concurrency-Safe Dining Session Engine:
        1. PostgreSQL Transaction
        2. SELECT FOR UPDATE on Table row
        3. Database-level partial unique index (idx_unique_active_dining_session_per_table)
           with IntegrityError fallback handling.
        """
        # Lock table row to synchronize concurrent scans
        tbl_stmt = select(Table).where(Table.id == table_id).with_for_update()
        tbl_res = await db.execute(tbl_stmt)
        table = tbl_res.scalar_one_or_none()

        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")

        # Check for existing active session (OPENED, ACTIVE, CHECKOUT)
        session_stmt = (
            select(DiningSession)
            .where(
                DiningSession.table_id == table_id,
                DiningSession.status.in_(["OPENED", "ACTIVE", "CHECKOUT"]),
            )
            .order_by(DiningSession.opened_at.desc())
        )
        session_res = await db.execute(session_stmt)
        active_session = session_res.scalar_one_or_none()

        if active_session:
            return active_session

        # Create new OPENED session
        # Table status remains Available (does not auto-occupy on scan)
        new_session_token = f"sess_tok_{secrets.token_urlsafe(32)}"
        new_session = DiningSession(
            table_id=table_id,
            session_token=new_session_token,
            status="OPENED",
        )

        try:
            async with db.begin_nested():
                db.add(new_session)
                await db.flush()
            await db.commit()
            await db.refresh(new_session)
            return new_session
        except IntegrityError:
            # Handle DB-level partial unique constraint race condition gracefully
            await db.rollback()
            session_res = await db.execute(session_stmt)
            fallback_session = session_res.scalar_one_or_none()
            if fallback_session:
                return fallback_session
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to resolve dining session concurrency.",
            )

    @staticmethod
    async def validate_qr_token(db: AsyncSession, qr_token: str) -> QRValidateResponse:
        qr_stmt = (
            select(TableQR)
            .where(TableQR.qr_token == qr_token, TableQR.is_active == True)
        )
        qr_res = await db.execute(qr_stmt)
        qr = qr_res.scalar_one_or_none()

        if not qr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_QR_TOKEN: QR token is invalid, expired, or rotated.",
            )

        table = await db.get(Table, qr.table_id)
        if not table or table.status == "Inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INACTIVE_TABLE: Table is currently inactive.",
            )

        session = await TableService.get_or_create_dining_session(db, table.id)

        return QRValidateResponse(
            is_valid=True,
            table_id=table.id,
            table_number=table.table_number,
            branch_id=table.branch_id,
            session_token=session.session_token,
            session_status=session.status,
        )

    @staticmethod
    async def get_session_bill(db: AsyncSession, session_id: int) -> SessionBillResponse:
        session = await db.get(DiningSession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dining session not found")

        table = await db.get(Table, session.table_id)
        table_number = table.table_number if table else f"T-{session.table_id}"

        # Query all orders for session
        orders_stmt = select(Order).where(Order.dining_session_id == session_id)
        orders_res = await db.execute(orders_stmt)
        orders = orders_res.scalars().all()

        items: List[SessionBillItemResponse] = []
        subtotal = 0.0

        for order in orders:
            for item in getattr(order, "items", []):
                qty = item.quantity
                price = float(item.unit_price or 0.0)
                tot = qty * price
                subtotal += tot
                items.append(
                    SessionBillItemResponse(
                        name=item.item_name or "Menu Item",
                        quantity=qty,
                        price=price,
                        total=tot,
                    )
                )

        # Configurable tax rate
        tax_rate = 0.05
        tax_amount = round(subtotal * tax_rate, 2)
        grand_total = round(subtotal + tax_amount, 2)

        return SessionBillResponse(
            session_id=session.id,
            table_number=table_number,
            status=session.status,
            items=items,
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            grand_total=grand_total,
        )

    @staticmethod
    async def close_dining_session(db: AsyncSession, session_id: int) -> DiningSession:
        session = await db.get(DiningSession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dining session not found")

        session.status = "CLOSED"
        session.closed_at = datetime.datetime.now(datetime.timezone.utc)

        table = await db.get(Table, session.table_id)
        if table:
            table.status = "Available"

        await db.commit()
        await db.refresh(session)
        return session
