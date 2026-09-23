from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.kitchen import KitchenOrder, PrintJob


class KitchenService:
    @staticmethod
    async def update_kitchen_order_status(db: AsyncSession, kitchen_order_id: int, new_status: str) -> KitchenOrder:
        query = select(KitchenOrder).where(KitchenOrder.id == kitchen_order_id)
        result = await db.execute(query)
        k_order = result.scalar_one_or_none()

        if not k_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kitchen order #{kitchen_order_id} not found.",
            )

        k_order.status = new_status
        await db.commit()
        await db.refresh(k_order)
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
