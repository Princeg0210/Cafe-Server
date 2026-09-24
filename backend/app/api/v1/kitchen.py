from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.kitchen import KitchenOrder, PrintJob
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

    from sqlalchemy.orm import selectinload
    query = query.options(
        selectinload(KitchenOrder.kitchen),
        selectinload(KitchenOrder.print_jobs)
    ).order_by(KitchenOrder.created_at.asc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/orders/{id}/status", response_model=KitchenOrderResponse)
async def update_kitchen_order_status(
    id: int, 
    data: KitchenStatusUpdate, 
    db: AsyncSession = Depends(get_db),
):
    return await KitchenService.update_kitchen_order_status(db, id, data.status)


@router.post("/orders/{id}/retry-print")
async def retry_print_job(
    id: int, 
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    query = select(PrintJob).where(PrintJob.kitchen_order_id == id, PrintJob.status == "FAILED")
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    if not jobs:
        raise HTTPException(status_code=404, detail="No failed print jobs found for this order.")
        
    for job in jobs:
        job.status = "RETRYING"
    await db.commit()
    
    from app.workers.celery_app import celery_app
    for job in jobs:
        celery_app.send_task("execute_print_job", args=[job.id])
        
    return {"message": f"Retrying {len(jobs)} print jobs."}
