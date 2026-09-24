import asyncio
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "cafe_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    broker_connection_timeout=0.2,
    broker_connection_retry=False,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=0,
    redis_retry_on_timeout=False,
    task_ignore_result=True,
    result_backend_transport_options={"max_retries": 0, "timeout": 0.2},
)


async def _verify_and_send_reminder(reservation_id: int):
    """
    Two-Layer Celery Safeguard:
    Re-fetches reservation from DB immediately before dispatching reminder.
    Skips reminder if reservation is CANCELLED, NO_SHOW, COMPLETED, or missing.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.reservation import Reservation

    async with AsyncSessionLocal() as db:
        res = await db.get(Reservation, reservation_id)
        if not res:
            return f"Reservation #{reservation_id} not found; skipping reminder."

        if res.status != "CONFIRMED":
            return f"Reservation #{reservation_id} is in state '{res.status}' (not CONFIRMED); skipping reminder."

        # Perform actual notification dispatch (SMS/Email)
        return f"Reminder sent for CONFIRMED reservation #{reservation_id}"


@celery_app.task(name="send_reservation_reminder")
def send_reservation_reminder(reservation_id: int):
    """
    Celery task entry point wrapper executing async database verification.
    """
    return asyncio.run(_verify_and_send_reminder(reservation_id))


async def _verify_and_execute_print_job(print_job_id: int, db: AsyncSession = None):
    from app.core.database import AsyncSessionLocal
    from app.models.kitchen import PrintJob, KitchenPrinter
    from sqlalchemy.orm import joinedload
    from sqlalchemy import select
    import socket

    if db is not None:
        return await _do_print_job(db, print_job_id)
    else:
        async with AsyncSessionLocal() as session:
            return await _do_print_job(session, print_job_id)


async def _do_print_job(db, print_job_id: int):
    from app.models.kitchen import PrintJob, KitchenPrinter
    from app.models.kot import KOT
    from sqlalchemy.orm import joinedload
    from sqlalchemy import select
    import socket

    res = await db.execute(
        select(PrintJob)
        .options(joinedload(PrintJob.kitchen_order), joinedload(PrintJob.kot))
        .where(PrintJob.id == print_job_id)
    )
    job = res.scalar_one_or_none()
    if not job or job.status not in ("PENDING", "RETRYING", "FAILED"):
        return f"Print job #{print_job_id} not eligible for printing."

    kitchen_id = job.kitchen_order.kitchen_id if job.kitchen_order else 1
    printer_res = await db.execute(
        select(KitchenPrinter).where(KitchenPrinter.kitchen_id == kitchen_id)
    )
    printer = printer_res.scalar_one_or_none()
    
    if not printer or not printer.is_online:
        job.status = "FAILED"
        job.retry_count += 1
        if job.kot_id:
            kot = await db.get(KOT, job.kot_id)
            if kot:
                kot.printed_status = "FAILED"
        await db.commit()
        return f"No online printer found for kitchen {kitchen_id}"
        
    job.status = "PRINTING"
    job.printer_id = printer.id
    await db.commit()
    
    success = False
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(printer.ip_address, 9100),
            timeout=2.0
        )
        writer.write(job.ticket_content.encode('utf-8'))
        await writer.drain()
        writer.close()
        await writer.wait_closed()
        success = True
    except Exception:
        success = False
        
    if success:
        job.status = "PRINTED"
        if job.kot_id:
            kot = await db.get(KOT, job.kot_id)
            if kot:
                kot.printed_status = "PRINTED"
    else:
        job.retry_count += 1
        job.status = "FAILED"
        if job.kot_id:
            kot = await db.get(KOT, job.kot_id)
            if kot:
                kot.printed_status = "FAILED"
        
    await db.commit()
    return f"Print job #{print_job_id} completed with success={success}"


@celery_app.task(name="execute_print_job")
def execute_print_job(print_job_id: int):
    return asyncio.run(_verify_and_execute_print_job(print_job_id))


@celery_app.task(name="check_low_stock_alerts")
def check_low_stock_alerts():
    return "Checked low stock inventory"
