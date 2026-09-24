import secrets
import uuid
import datetime
from typing import Optional, List
from sqlalchemy import select, update, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.table import Table, TableQR, DiningSession
from app.models.order import Order, OrderItem
from app.models.reservation import Reservation
from app.schemas.table import (
    QRValidateResponse,
    ReservationNotice,
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

        # Check for active / upcoming reservation on this table
        res_stmt = (
            select(Reservation)
            .options(selectinload(Reservation.customer))
            .where(
                or_(
                    Reservation.table_id == table.id,
                    Reservation.table_name == table.table_number,
                    and_(table.id == 1, or_(Reservation.table_id.is_(None), Reservation.table_id == 1)),
                ),
                Reservation.status.in_(["CONFIRMED", "ARRIVED", "SEATED"]),
            )
            .order_by(Reservation.reservation_date.asc(), Reservation.time_slot.asc())
        )
        res_res = await db.execute(res_stmt)
        candidate_reservations = res_res.scalars().all()

        from app.utils.helpers import calculate_reservation_window
        from app.workers.celery_app import celery_app

        active_res = None
        active_calc = None
        modified_status = False

        for res_item in candidate_reservations:
            calc = calculate_reservation_window(res_item.reservation_date, res_item.time_slot)

            # Rule 2: 15-Minute Grace Period & Auto-Release (No-Show Protection)
            if res_item.status == "CONFIRMED" and calc.get("grace_exceeded"):
                res_item.status = "NO_SHOW"
                if res_item.celery_task_id:
                    try:
                        celery_app.control.revoke(res_item.celery_task_id, terminate=True)
                    except Exception:
                        pass
                    res_item.celery_task_id = None
                modified_status = True
                continue

            # Rule 1: Time-Window Smart Filter (Don't Alert Lunch Guests for Dinner Bookings)
            # Only show "TABLE RESERVED" notice if within 60-90 min window or already arrived/seated
            if res_item.status == "CONFIRMED":
                if calc.get("is_within_alert_window"):
                    active_res = res_item
                    active_calc = calc
                    break
            elif res_item.status in ["ARRIVED", "SEATED"]:
                if calc.get("is_today") and not calc.get("grace_exceeded"):
                    active_res = res_item
                    active_calc = calc
                    break

        if modified_status:
            await db.commit()

        reservation_notice = None
        is_reserved = False
        if active_res:
            is_reserved = True
            cust_name = active_res.customer.name if active_res.customer else "Reserved Guest"
            can_qd = active_calc.get("can_quick_dine", False) if active_calc else False
            qd_mins = active_calc.get("quick_dine_minutes") if active_calc else None
            mins_until = active_calc.get("minutes_until") if active_calc else None

            reservation_notice = ReservationNotice(
                is_reserved=True,
                reservation_id=active_res.id,
                customer_name=cust_name,
                guest_count=active_res.guest_count,
                time_slot=active_res.time_slot,
                reservation_date=str(active_res.reservation_date),
                status=active_res.status,
                floor_number=active_res.floor_number or 1,
                table_name=active_res.table_name or table.table_number,
                minutes_until_reservation=mins_until,
                can_quick_dine=can_qd,
                quick_dine_minutes=qd_mins,
                allow_self_checkin=active_res.status in ["CONFIRMED", "ARRIVED"],
            )

        return QRValidateResponse(
            is_valid=True,
            table_id=table.id,
            table_number=table.table_number,
            branch_id=table.branch_id,
            session_id=session.id,
            session_token=session.session_token,
            session_status=session.status,
            is_reserved=is_reserved,
            reservation=reservation_notice,
        )

    @staticmethod
    async def get_session_bill(db: AsyncSession, session_id: int) -> SessionBillResponse:
        session = await db.get(DiningSession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dining session not found")

        table = await db.get(Table, session.table_id)
        table_number = table.table_number if table else f"T-{session.table_id}"

        # Query all orders for session with eager loaded items and menu_items
        orders_stmt = (
            select(Order)
            .where(Order.dining_session_id == session_id)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
        )
        orders_res = await db.execute(orders_stmt)
        orders = orders_res.scalars().all()

        aggregated_items: dict[str, dict] = {}
        subtotal = 0.0

        for order in orders:
            for item in order.items:
                qty = item.quantity
                price = float(item.unit_price or 0.0)
                tot = qty * price
                subtotal += tot
                name = item.menu_item.name if item.menu_item else "Menu Item"
                if name in aggregated_items:
                    aggregated_items[name]["quantity"] += qty
                    aggregated_items[name]["total"] += tot
                else:
                    aggregated_items[name] = {
                        "name": name,
                        "quantity": qty,
                        "price": price,
                        "total": tot,
                    }

        items = [
            SessionBillItemResponse(
                name=val["name"],
                quantity=val["quantity"],
                price=val["price"],
                total=round(val["total"], 2),
            )
            for val in aggregated_items.values()
        ]

        # Dynamic configurable tax rate
        tax_rate = float(getattr(settings, "DEFAULT_TAX_RATE", "0.05"))
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
