import uuid
import datetime
import asyncio
import secrets
from decimal import Decimal
from typing import Dict, List
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.table import Table, TableQR, DiningSession
from app.services.table_service import TableService
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.kitchen import Kitchen, MenuItemKitchenMapping, KitchenOrder, PrintJob
from app.models.kot import KOT
from app.schemas.order import OrderCreate
from app.services.capacity_service import CapacityService
from app.services.inventory_service import InventoryService


class OrderService:
    @staticmethod
    async def place_order(db: AsyncSession, data: OrderCreate) -> Order:
        try:
            # Step 1: Validate QR Token and get DiningSession
            val = await TableService.validate_qr_token(db, data.qr_token)

            if data.session_token:
                sess_query = select(DiningSession).where(
                    DiningSession.session_token == data.session_token,
                    DiningSession.table_id == val.table_id,
                )
                sess_res = await db.execute(sess_query)
                dining_session = sess_res.scalar_one_or_none()
                if not dining_session:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="INVALID_DINING_SESSION: Dining session invalid or table mismatch.",
                    )
                if dining_session.status == "CLOSED":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="CLOSED_DINING_SESSION: Cannot place order for a closed dining session.",
                    )
            else:
                dining_session = await TableService.get_or_create_dining_session(db, val.table_id)
                if dining_session.status == "CLOSED":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="CLOSED_DINING_SESSION: Cannot place order for a closed dining session.",
                    )


            # Mark session ACTIVE and table Occupied on first order
            if dining_session.status == "OPENED":
                dining_session.status = "ACTIVE"
            
            table = await db.get(Table, dining_session.table_id)
            if table and table.status == "Available":
                table.status = "Occupied"


            # Generate daily sequential order number (1 to n) with concurrency-safe retry loop
            today_date = datetime.date.today()
            date_prefix = today_date.strftime("%Y%m%d")

            order = None
            max_order_retries = 10
            for order_attempt in range(max_order_retries):
                try:
                    async with db.begin_nested():
                        daily_orders_stmt = select(Order.order_number).where(
                            Order.order_number.like(f"ORD-{date_prefix}-%")
                        )
                        res_orders = await db.execute(daily_orders_stmt)
                        existing_numbers = set(res_orders.scalars().all())

                        order_seq = len(existing_numbers) + 1 + order_attempt
                        if order_attempt > 0:
                            # Add random unique suffix on collision retry to guarantee zero stampede/lock wait
                            rnd_suffix = secrets.token_hex(2).upper()
                            order_number = f"ORD-{date_prefix}-{order_seq:03d}-{rnd_suffix}"
                        else:
                            order_number = f"ORD-{date_prefix}-{order_seq:03d}"
                            while order_number in existing_numbers:
                                order_seq += 1
                                order_number = f"ORD-{date_prefix}-{order_seq:03d}"

                        order = Order(
                            dining_session_id=dining_session.id,
                            order_number=order_number,
                            status="CONFIRMED",
                        )
                        db.add(order)
                        await db.flush()
                        break
                except IntegrityError:
                    if order_attempt == max_order_retries - 1:
                        raise
                    await asyncio.sleep(0.005 * (order_attempt + 1))

            status_log = OrderStatusHistory(
                order_id=order.id,
                old_status=None,
                new_status="CONFIRMED",
            )
            db.add(status_log)

            # Track items and totals for KOT
            total_order_amount = Decimal("0.00")
            total_order_items = 0
            all_kot_items: List[dict] = []

            # Dictionary to route items to kitchens (kitchen_id -> list of (item_name, qty, instructions))
            kitchen_item_routes: Dict[int, List[dict]] = {}

            for item_data in data.items:
                menu_item = None

                # 1. Match by name first if provided (guarantees exact item and correct price!)
                if item_data.name and item_data.name.strip():
                    raw_name = item_data.name.strip()
                    alias_target = {
                        "rosehip & spearmint tisane": "himalayan rosehip & mint tisane",
                        "himalayan mineral water natural spring": "himalayan mineral water",
                    }.get(raw_name.lower(), raw_name.lower())

                    name_query = select(MenuItem).where(
                        func.lower(func.trim(MenuItem.name)) == alias_target,
                        MenuItem.is_active == True,
                        MenuItem.is_available == True,
                    )
                    name_res = await db.execute(name_query)
                    menu_item = name_res.scalar_one_or_none()

                # 2. Fallback to menu_item_id lookup if not matched by name
                if not menu_item and item_data.menu_item_id:
                    menu_query = select(MenuItem).where(
                        MenuItem.id == item_data.menu_item_id,
                        MenuItem.is_active == True,
                        MenuItem.is_available == True,
                    )
                    menu_res = await db.execute(menu_query)
                    menu_item = menu_res.scalar_one_or_none()

                if not menu_item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"MENU_ITEM_NOT_FOUND: Menu item #{item_data.menu_item_id or item_data.name} is unavailable.",
                    )

                # Step 2: Validate Production Capacity Limit (PIZZA_SOLD_OUT check)
                await CapacityService.validate_and_allocate(db, menu_item.id, item_data.quantity)

                # Step 3: Validate & Deduct BOM Ingredient Stock
                await InventoryService.deduct_bom_stock(db, menu_item.id, item_data.quantity, order_number)

                unit_price = Decimal(str(menu_item.price))
                subtotal = unit_price * Decimal(str(item_data.quantity))

                total_order_amount += subtotal
                total_order_items += item_data.quantity
                all_kot_items.append({
                    "name": menu_item.name,
                    "qty": item_data.quantity,
                    "instructions": item_data.special_instructions,
                })

                order_item = OrderItem(
                    order_id=order.id,
                    menu_item_id=menu_item.id,
                    quantity=item_data.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                    special_instructions=item_data.special_instructions,
                )
                db.add(order_item)

                # Map item to Single Production Kitchen (Kitchen ID #1)
                target_kitchen_id = 1

                if target_kitchen_id not in kitchen_item_routes:
                    kitchen_item_routes[target_kitchen_id] = []
                kitchen_item_routes[target_kitchen_id].append(
                    {
                        "name": menu_item.name,
                        "qty": item_data.quantity,
                        "instructions": item_data.special_instructions,
                    }
                )

            # Generate Daily KOT Sequence with Concurrency-Safe Retry Loop
            today = today_date

            created_kitchen_orders = []
            created_print_jobs = []
            kot = None
            table_display = table.table_number if table else str(val.table_id)

            max_retries = 10
            for attempt in range(max_retries):
                try:
                    async with db.begin_nested():
                        max_seq_res = await db.execute(
                            select(func.coalesce(func.max(KOT.sequence_number), 0)).where(
                                KOT.business_date == today
                            )
                        )
                        next_seq = (max_seq_res.scalar() or 0) + 1
                        if attempt > 0:
                            next_seq += secrets.randbelow(15) + 1 + attempt * 2
                        kot_number = f"KOT-{next_seq:03d}"

                        kot = KOT(
                            kot_number=kot_number,
                            sequence_number=next_seq,
                            business_date=today,
                            table_id=dining_session.table_id,
                            dining_session_id=dining_session.id,
                            order_id=order.id,
                            total_amount=total_order_amount,
                            items_count=total_order_items,
                            status="GENERATED",
                            printed_status="PENDING",
                        )
                        db.add(kot)
                        await db.flush()

                        # Formulate Thermal Printer Ticket
                        kot_lines = [
                            "================================",
                            "          JAADOO CAFE           ",
                            "================================",
                            f"{kot.kot_number}        TABLE: {table_display}",
                            f"Date: {today.strftime('%d %b %Y')}",
                            f"Time: {order.created_at.strftime('%I:%M %p')}",
                            "--------------------------------",
                        ]
                        for r_item in all_kot_items:
                            line = f"{r_item['qty']} x {r_item['name']}"
                            if r_item["instructions"]:
                                line += f" ({r_item['instructions']})"
                            kot_lines.append(line)
                        kot_lines.extend([
                            "--------------------------------",
                            f"Total Items: {total_order_items}",
                            f"Total: Rs. {total_order_amount}",
                            "================================",
                        ])

                        # Step 4: Create Thermal PrintJob for KOT
                        kot_print_job = PrintJob(
                            kot_id=kot.id,
                            ticket_content="\n".join(kot_lines),
                            status="PENDING",
                        )
                        db.add(kot_print_job)
                        await db.flush()
                        created_print_jobs.append(kot_print_job)
                        break
                except IntegrityError:
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(0.005 * (attempt + 1))

            # Step 5: Maintain kitchen orders for backward compatibility & routing
            for kitchen_id, routed_items in kitchen_item_routes.items():
                k_order = KitchenOrder(
                    order_id=order.id,
                    kitchen_id=kitchen_id,
                    status="SENT",
                )
                db.add(k_order)
                await db.flush()
                created_kitchen_orders.append(k_order)

                ticket_lines = [f"=== KITCHEN TICKET #{k_order.id} ===", f"Order #: {order_number}"]
                for r_item in routed_items:
                    line = f"- {r_item['qty']}x {r_item['name']}"
                    if r_item["instructions"]:
                        line += f" ({r_item['instructions']})"
                    ticket_lines.append(line)

                k_print_job = PrintJob(
                    kitchen_order_id=k_order.id,
                    ticket_content="\n".join(ticket_lines),
                    status="PENDING",
                )
                db.add(k_print_job)
                await db.flush()
                created_print_jobs.append(k_print_job)

            await db.commit()
            await db.refresh(order)

            # Broadcast WebSocket events to POS and Kitchen
            from app.api.websocket import ws_manager
            from app.workers.celery_app import celery_app

            await ws_manager.broadcast("pos", {
                "event": "KOT_CREATED",
                "kot_id": kot.id,
                "kot_number": kot.kot_number,
                "table_number": table_display,
                "total_amount": float(total_order_amount),
                "items_count": total_order_items,
                "printed_status": kot.printed_status,
                "created_at": kot.created_at.isoformat(),
            })

            for k_order in created_kitchen_orders:
                await ws_manager.broadcast("kitchen", {
                    "event": "KITCHEN_ORDER_CREATED",
                    "kitchen_id": k_order.kitchen_id,
                    "kitchen_order_id": k_order.id
                })
            
            # Fire thermal print execution (Never cancels order on failure)
            for print_job in created_print_jobs:
                try:
                    celery_app.send_task("execute_print_job", args=[print_job.id], ignore_result=True)
                except Exception:
                    pass

            # Reload relationship items with selectinload for async session
            from sqlalchemy.orm import selectinload
            res = await db.execute(
                select(Order)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.kitchen_orders),
                )
                .where(Order.id == order.id)
            )
            return res.scalar_one()
        except Exception:
            await db.rollback()
            raise
