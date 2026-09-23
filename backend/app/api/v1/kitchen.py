from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.models.kitchen import KitchenOrder
from app.schemas.kitchen import KitchenOrderResponse, KitchenStatusUpdate
from app.services.kitchen_service import KitchenService

router = APIRouter(prefix="/kitchen", tags=["Dual-Kitchen KDS"])


@router.get("/orders", response_model=List[KitchenOrderResponse])
async def list_kitchen_orders(
    kitchen_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(KitchenOrder)
    if kitchen_id:
        query = query.where(KitchenOrder.kitchen_id == kitchen_id)
    if status:
        query = query.where(KitchenOrder.status == status)
    else:
        query = query.where(KitchenOrder.status.in_(["SENT", "PREPARING", "READY"]))

    query = query.order_by(KitchenOrder.created_at.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/orders/{id}/status", response_model=KitchenOrderResponse)
async def update_kitchen_order_status(
    id: int, data: KitchenStatusUpdate, db: AsyncSession = Depends(get_db)
):
    return await KitchenService.update_kitchen_order_status(db, id, data.status)
