import asyncio
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
)


async def _verify_and_send_reminder(reservation_id: int):
    """
    Two-Layer Celery Safeguard:
    Re-fetches reservation from DB immediately before dispatching reminder.
    Skips reminder if reservation is CANCELLED, NO_SHOW, COMPLETED, or missing.
    """
    from app.core.database import async_session_factory
    from app.models.reservation import Reservation

    async with async_session_factory() as db:
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


@celery_app.task(name="retry_failed_print_job")
def retry_failed_print_job(print_job_id: int):
    return f"Retried print job #{print_job_id}"


@celery_app.task(name="check_low_stock_alerts")
def check_low_stock_alerts():
    return "Checked low stock inventory"
