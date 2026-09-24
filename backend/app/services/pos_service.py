import datetime
from decimal import Decimal
from typing import List, Optional
from collections import defaultdict
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.kot import KOT
from app.models.order import Order, OrderItem
from app.models.table import Table, DiningSession
from app.models.menu import MenuItem, MenuCategory
from app.models.kitchen import PrintJob, KitchenPrinter
from app.schemas.pos import (
    KOTResponse,
    KOTItemResponse,
    POSSummaryResponse,
    ItemSummaryResponse,
    CategorySummaryResponse,
)
from app.utils.helpers import utc_now


class POSService:
    @staticmethod
    def _format_hour(hour: int) -> str:
        """Format 24-hour integer into readable string, e.g., 20 -> '8–9 PM'."""
        start_period = "AM" if hour < 12 else "PM"
        start_h = 12 if hour in (0, 12) else (hour % 12)
        next_h_raw = (hour + 1) % 24
        end_period = "AM" if next_h_raw < 12 else "PM"
        end_h = 12 if next_h_raw in (0, 12) else (next_h_raw % 12)
        
        if start_period == end_period:
            return f"{start_h}–{end_h} {start_period}"
        return f"{start_h} {start_period} – {end_h} {end_period}"

    @staticmethod
    async def get_kots(
        db: AsyncSession,
        target_date: Optional[datetime.date] = None,
        limit: int = 100,
    ) -> List[KOTResponse]:
        if not target_date:
            target_date = datetime.date.today()

        stmt = (
            select(KOT)
            .options(
                selectinload(KOT.table),
                selectinload(KOT.order).selectinload(Order.items).selectinload(OrderItem.menu_item),
                selectinload(KOT.print_jobs),
            )
            .where(KOT.business_date == target_date)
            .order_by(KOT.created_at.desc())
            .limit(limit)
        )
        res = await db.execute(stmt)
        kots = res.scalars().all()

        results: List[KOTResponse] = []
        for kot in kots:
            items_list = []
            if kot.order and kot.order.items:
                for oi in kot.order.items:
                    items_list.append(
                        KOTItemResponse(
                            name=oi.menu_item.name if oi.menu_item else "Unknown Item",
                            quantity=oi.quantity,
                            unit_price=oi.unit_price,
                            subtotal=oi.subtotal,
                            special_instructions=oi.special_instructions,
                        )
                    )

            print_job_id = kot.print_jobs[0].id if kot.print_jobs else None

            results.append(
                KOTResponse(
                    id=kot.id,
                    kot_number=kot.kot_number,
                    sequence_number=kot.sequence_number,
                    business_date=kot.business_date,
                    table_number=kot.table.table_number if kot.table else f"#{kot.table_id}",
                    table_id=kot.table_id,
                    dining_session_id=kot.dining_session_id,
                    order_id=kot.order_id,
                    order_number=kot.order.order_number if kot.order else f"ORD-{kot.order_id}",
                    total_amount=kot.total_amount,
                    items_count=kot.items_count,
                    status=kot.status,
                    printed_status=kot.printed_status,
                    created_at=kot.created_at,
                    items=items_list,
                    print_job_id=print_job_id,
                )
            )
        return results

    @staticmethod
    async def get_summary(
        db: AsyncSession,
        target_date: Optional[datetime.date] = None,
    ) -> POSSummaryResponse:
        if not target_date:
            target_date = datetime.date.today()

        stmt = (
            select(KOT)
            .options(
                selectinload(KOT.order)
                .selectinload(Order.items)
                .selectinload(OrderItem.menu_item)
                .selectinload(MenuItem.category)
            )
            .where(KOT.business_date == target_date)
            .order_by(KOT.created_at.asc())
        )
        res = await db.execute(stmt)
        kots = res.scalars().all()

        total_kots = len(kots)
        tables_served = len({k.table_id for k in kots})
        total_items = sum(k.items_count for k in kots)
        total_val = sum(k.total_amount for k in kots)

        avg_items_per_kot = round(total_items / total_kots, 2) if total_kots > 0 else 0.0
        avg_kot_value = round(float(total_val) / total_kots, 2) if total_kots > 0 else 0.0

        # Hourly breakdown & peak hour
        hour_counts = defaultdict(int)
        for k in kots:
            hour_counts[k.created_at.hour] += 1

        if hour_counts:
            peak_hour_int = max(hour_counts, key=hour_counts.get)
            peak_hour_str = POSService._format_hour(peak_hour_int)
            active_hours = max(len(hour_counts), 1)
            kots_per_hour = round(total_kots / active_hours, 1)
        else:
            peak_hour_str = "None"
            kots_per_hour = 0.0

        # Item & category breakdown
        item_counter = defaultdict(int)
        cat_counter = defaultdict(int)

        for k in kots:
            if k.order and k.order.items:
                for oi in k.order.items:
                    m_item = oi.menu_item
                    item_name = m_item.name if m_item else "Item"
                    cat_name = m_item.category.name if (m_item and m_item.category) else "General"
                    item_counter[item_name] += oi.quantity
                    cat_counter[cat_name] += oi.quantity

        sorted_items = [
            ItemSummaryResponse(name=name, quantity=qty)
            for name, qty in sorted(item_counter.items(), key=lambda x: x[1], reverse=True)
        ]

        sorted_categories = [
            CategorySummaryResponse(category=cat, quantity=qty)
            for cat, qty in sorted(cat_counter.items(), key=lambda x: x[1], reverse=True)
        ]

        # Yesterday comparison
        yesterday_date = target_date - datetime.timedelta(days=1)
        yest_stmt = (
            select(KOT)
            .options(
                selectinload(KOT.order)
                .selectinload(Order.items)
                .selectinload(OrderItem.menu_item)
                .selectinload(MenuItem.category)
            )
            .where(KOT.business_date == yesterday_date)
        )
        yest_res = await db.execute(yest_stmt)
        yest_kots = yest_res.scalars().all()

        yest_cat_counts = defaultdict(int)
        for yk in yest_kots:
            if yk.order and yk.order.items:
                for oi in yk.order.items:
                    m_item = oi.menu_item
                    cat_name = (m_item.category.name.lower() if m_item and m_item.category else "other")
                    yest_cat_counts[cat_name] += oi.quantity

        def _get_cat_qty(counter_dict, search_key):
            for k, v in counter_dict.items():
                if search_key in k.lower():
                    return v
            return 0

        comparison = {
            "today": {
                "kots": total_kots,
                "pizzas": _get_cat_qty(cat_counter, "pizza"),
                "pasta": _get_cat_qty(cat_counter, "pasta"),
                "beverages": _get_cat_qty(cat_counter, "beverag") + _get_cat_qty(cat_counter, "drink"),
            },
            "yesterday": {
                "kots": len(yest_kots),
                "pizzas": _get_cat_qty(yest_cat_counts, "pizza"),
                "pasta": _get_cat_qty(yest_cat_counts, "pasta"),
                "beverages": _get_cat_qty(yest_cat_counts, "beverag") + _get_cat_qty(yest_cat_counts, "drink"),
            },
        }

        return POSSummaryResponse(
            business_date=target_date.strftime("%d %B %Y"),
            total_kots=total_kots,
            tables_served=tables_served,
            total_items=total_items,
            avg_items_per_kot=avg_items_per_kot,
            avg_kot_value=avg_kot_value,
            kots_per_hour=kots_per_hour,
            peak_hour=peak_hour_str,
            item_summary=sorted_items,
            category_summary=sorted_categories,
            comparison=comparison,
        )

    @staticmethod
    async def retry_kot_print(db: AsyncSession, kot_id: int) -> dict:
        stmt = (
            select(KOT)
            .options(
                selectinload(KOT.table),
                selectinload(KOT.order).selectinload(Order.items).selectinload(OrderItem.menu_item),
                selectinload(KOT.print_jobs),
            )
            .where(KOT.id == kot_id)
        )
        res = await db.execute(stmt)
        kot = res.scalar_one_or_none()
        if not kot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KOT #{kot_id} not found.")

        # Find or create PrintJob
        print_job = kot.print_jobs[0] if kot.print_jobs else None
        if not print_job:
            ticket_lines = [
                "================================",
                "          JAADOO CAFE           ",
                "================================",
                f"{kot.kot_number}        TABLE: {kot.table.table_number if kot.table else kot.table_id}",
                f"Date: {kot.business_date.strftime('%d %b %Y')}",
                f"Time: {kot.created_at.strftime('%I:%M %p')}",
                "--------------------------------",
            ]
            if kot.order and kot.order.items:
                for oi in kot.order.items:
                    name = oi.menu_item.name if oi.menu_item else "Item"
                    line = f"{oi.quantity} x {name}"
                    if oi.special_instructions:
                        line += f" ({oi.special_instructions})"
                    ticket_lines.append(line)
            ticket_lines.extend([
                "--------------------------------",
                f"Total Items: {kot.items_count}",
                f"Total: Rs. {kot.total_amount}",
                "================================",
            ])
            print_job = PrintJob(
                kot_id=kot.id,
                ticket_content="\n".join(ticket_lines),
                status="PENDING",
            )
            db.add(print_job)
            await db.flush()

        print_job.status = "RETRYING"
        kot.printed_status = "PENDING"
        await db.commit()

        # Attempt print execution
        from app.workers.celery_app import _verify_and_execute_print_job
        try:
            await _verify_and_execute_print_job(print_job.id, db=db)
        except Exception:
            kot.printed_status = "FAILED"
            print_job.status = "FAILED"
            await db.commit()

        await db.refresh(kot)
        return {
            "kot_id": kot.id,
            "kot_number": kot.kot_number,
            "printed_status": kot.printed_status,
            "message": f"Print retry processed. Status: {kot.printed_status}",
        }

    @staticmethod
    async def close_dining_session(db: AsyncSession, session_id: int) -> dict:
        stmt = select(DiningSession).options(selectinload(DiningSession.table)).where(DiningSession.id == session_id)
        res = await db.execute(stmt)
        sess = res.scalar_one_or_none()
        if not sess:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dining session #{session_id} not found.")

        sess.status = "CLOSED"
        sess.closed_at = utc_now()
        if sess.table:
            sess.table.status = "Available"

        await db.commit()

        from app.api.websocket import ws_manager
        await ws_manager.broadcast("tables", {
            "event": "SESSION_CLOSED",
            "session_id": sess.id,
            "table_id": sess.table_id,
            "table_number": sess.table.table_number if sess.table else None,
        })

        return {"message": f"Dining session #{session_id} closed successfully. Table is now Available."}
