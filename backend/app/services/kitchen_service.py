from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.kitchen import KitchenOrder, PrintJob


class KitchenService:
    @staticmethod
    async def update_kitchen_order_status(db: AsyncSession, kitchen_order_id: int, new_status: str) -> KitchenOrder:
        from sqlalchemy.orm import selectinload
        query = select(KitchenOrder).options(
            selectinload(KitchenOrder.kitchen),
            selectinload(KitchenOrder.print_jobs)
        ).where(KitchenOrder.id == kitchen_order_id)
        result = await db.execute(query)
        k_order = result.scalar_one_or_none()

        if not k_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kitchen order #{kitchen_order_id} not found.",
            )

        k_order.status = new_status
        await db.commit()
        
        # Reload to populate relationships for response
        query = select(KitchenOrder).options(
            selectinload(KitchenOrder.kitchen),
            selectinload(KitchenOrder.print_jobs)
        ).where(KitchenOrder.id == kitchen_order_id)
        result = await db.execute(query)
        k_order = result.scalar_one()

        from app.api.websocket import ws_manager
        await ws_manager.broadcast("kitchen", {
            "event": "KITCHEN_ORDER_UPDATED",
            "kitchen_id": k_order.kitchen_id,
            "kitchen_order_id": k_order.id,
            "status": new_status
        })

        return k_order

    @staticmethod
    async def process_print_job(db: AsyncSession, print_job_id: int, success: bool) -> PrintJob:
        query = select(PrintJob).where(PrintJob.id == print_job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Print job #{print_job_id} not found.",
            )

        if success:
            job.status = "PRINTED"
        else:
            job.retry_count += 1
            if job.retry_count >= 3:
                job.status = "FAILED"
            else:
                job.status = "RETRYING"

        await db.commit()
        await db.refresh(job)
        return job
