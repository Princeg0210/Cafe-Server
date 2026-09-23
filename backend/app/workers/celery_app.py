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


@celery_app.task(name="send_reservation_reminder")
def send_reservation_reminder(reservation_id: int):
    # Background task for sending SMS/email reminders
    return f"Reminder sent for reservation #{reservation_id}"


@celery_app.task(name="retry_failed_print_job")
def retry_failed_print_job(print_job_id: int):
    # Background task for retrying failed thermal kitchen print jobs
    return f"Retried print job #{print_job_id}"


@celery_app.task(name="check_low_stock_alerts")
def check_low_stock_alerts():
    # Background task for periodic inventory low-stock alerts
    return "Checked low stock inventory"
