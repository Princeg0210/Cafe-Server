import uuid
from decimal import Decimal
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.table import TableQR, DiningSession
from app.models.menu import MenuItem
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.kitchen import Kitchen, MenuItemKitchenMapping, KitchenOrder, PrintJob
from app.schemas.order import OrderCreate
from app.services.capacity_service import CapacityService
from app.services.inventory_service import InventoryService


class OrderService:
    @staticmethod
    async def place_order(db: AsyncSession, data: OrderCreate) -> Order:
        try:
            # Step 1: Validate QR Token and get active DiningSession
            qr_query = select(TableQR).where(TableQR.qr_token == data.qr_token, TableQR.is_active == True)
            qr_res = await db.execute(qr_query)
            table_qr = qr_res.scalar_one_or_none()

            if not table_qr:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="INVALID_QR_TOKEN: Scanned table QR code is invalid or inactive.",
                )

            session_query = select(DiningSession).where(
                DiningSession.table_id == table_qr.table_id,
                DiningSession.status.in_(["OPENED", "ACTIVE"]),
            )
            session_res = await db.execute(session_query)
            dining_session = session_res.scalar_one_or_none()

            if not dining_session:
                # Auto-open a dining session for QR ordering
                dining_session = DiningSession(
                    table_id=table_qr.table_id,
                    session_token=f"sess-{uuid.uuid4().hex[:12]}",
                    status="ACTIVE",
                )
                db.add(dining_session)
                await db.flush()

            # Generate unique order number
            order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

            order = Order(
                dining_session_id=dining_session.id,
                order_number=order_number,
                status="CONFIRMED",
            )
            db.add(order)
            await db.flush()

            status_log = OrderStatusHistory(
                order_id=order.id,
                old_status=None,
                new_status="CONFIRMED",
            )
            db.add(status_log)

            # Dictionary to route items to kitchens (kitchen_id -> list of (item_name, qty, instructions))
            kitchen_item_routes: Dict[int, List[dict]] = {}

            for item_data in data.items:
                # Fetch menu item
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
                        detail=f"MENU_ITEM_NOT_FOUND: Menu item #{item_data.menu_item_id} is unavailable.",
                    )

                # Step 2: Validate Production Capacity Limit (PIZZA_SOLD_OUT check)
                await CapacityService.validate_and_allocate(db, menu_item.id, item_data.quantity)

                # Step 3: Validate & Deduct BOM Ingredient Stock
                await InventoryService.deduct_bom_stock(db, menu_item.id, item_data.quantity, order_number)

                unit_price = Decimal(str(menu_item.price))
                subtotal = unit_price * Decimal(str(item_data.quantity))

                order_item = OrderItem(
                    order_id=order.id,
                    menu_item_id=menu_item.id,
                    quantity=item_data.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                    special_instructions=item_data.special_instructions,
                )
                db.add(order_item)

                # Map item to kitchen
                mapping_query = select(MenuItemKitchenMapping).where(
                    MenuItemKitchenMapping.menu_item_id == menu_item.id
                )
                mapping_res = await db.execute(mapping_query)
                mapping = mapping_res.scalar_one_or_none()

                # Default to kitchen_id=1 (Hot Food) if mapping missing
                target_kitchen_id = mapping.kitchen_id if mapping else 1

                if target_kitchen_id not in kitchen_item_routes:
                    kitchen_item_routes[target_kitchen_id] = []
                kitchen_item_routes[target_kitchen_id].append(
                    {
                        "name": menu_item.name,
                        "qty": item_data.quantity,
                        "instructions": item_data.special_instructions,
                    }
                )

            # Step 4: Create Kitchen Orders & Print Jobs for dual kitchen routing
            for kitchen_id, routed_items in kitchen_item_routes.items():
                k_order = KitchenOrder(
                    order_id=order.id,
                    kitchen_id=kitchen_id,
                    status="SENT",
                )
                db.add(k_order)
                await db.flush()

                ticket_lines = [f"=== KITCHEN TICKET #{k_order.id} ===", f"Order #: {order_number}"]
                for r_item in routed_items:
                    line = f"- {r_item['qty']}x {r_item['name']}"
                    if r_item["instructions"]:
                        line += f" ({r_item['instructions']})"
                    ticket_lines.append(line)

                print_job = PrintJob(
                    kitchen_order_id=k_order.id,
                    ticket_content="\n".join(ticket_lines),
                    status="PENDING",
                )
                db.add(print_job)

            await db.commit()
            await db.refresh(order)

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
