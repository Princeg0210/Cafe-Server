"""WhatsApp booking notifications via the Meta WhatsApp Cloud API (approved message templates).

Fire-and-forget: sends run as background tasks after the booking change is committed, so a
WhatsApp outage or error is only logged and never blocks or fails a booking. When
WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are unset, every call is a no-op.
"""
import asyncio
import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("cafe_piza.whatsapp")

# Keep references to in-flight sends so they aren't garbage-collected mid-request
_pending_sends: set = set()


def is_configured() -> bool:
    return bool(settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID)


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Digits-only international number; bare 10-digit (or 0-prefixed) Indian numbers get 91."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10:
        digits = "91" + digits
    return digits if 11 <= len(digits) <= 15 else None


def build_template_payload(to: str, template: str, params: List[str]) -> dict:
    return {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template,
            "language": {"code": settings.WHATSAPP_TEMPLATE_LANGUAGE},
            "components": [
                {"type": "body", "parameters": [{"type": "text", "text": str(p)} for p in params]}
            ],
        },
    }


async def send_template(phone: Optional[str], template: str, params: List[str]) -> bool:
    if not is_configured():
        return False
    to = normalize_phone(phone)
    if not to:
        logger.warning("WhatsApp: skipped %s, unusable phone number", template)
        return False
    url = (
        f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/"
        f"{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                url,
                headers={"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"},
                json=build_template_payload(to, template, params),
            )
        if res.status_code >= 400:
            logger.warning("WhatsApp: %s failed (%s): %s", template, res.status_code, res.text[:300])
            return False
        return True
    except httpx.HTTPError as exc:
        logger.warning("WhatsApp: %s request error: %s", template, exc)
        return False


async def _load_and_send(reservation_id: int, kind: str) -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.core.database import AsyncSessionLocal
    from app.models.reservation import Reservation

    try:
        async with AsyncSessionLocal() as db:
            r = (
                await db.execute(
                    select(Reservation)
                    .options(selectinload(Reservation.customer))
                    .where(Reservation.id == reservation_id)
                )
            ).scalar_one_or_none()
        if not r or not r.customer:
            return
        name = (r.customer.name or "Guest").strip()
        date_str = r.reservation_date.strftime("%d %b %Y") if r.reservation_date else ""
        if kind == "confirmed":
            template = settings.WHATSAPP_CONFIRMATION_TEMPLATE
            params = [
                name,
                r.booking_id,
                date_str,
                r.time_slot or "",
                str(r.guest_count or ""),
                r.table_name or "Table to be assigned",
                f"{float(r.advance_amount or 0):.2f}",
            ]
        else:
            template = settings.WHATSAPP_CANCELLATION_TEMPLATE
            params = [
                name,
                r.booking_id,
                date_str,
                r.time_slot or "",
                f"{float(r.cancellation_refund_amount or 0):.2f}",
            ]
        await send_template(r.customer.phone, template, params)
    except Exception:  # never let a notification failure surface anywhere
        logger.exception("WhatsApp: %s notification failed for reservation #%s", kind, reservation_id)


def _schedule(reservation_id: int, kind: str) -> None:
    if not is_configured():
        return
    try:
        task = asyncio.get_running_loop().create_task(_load_and_send(reservation_id, kind))
    except RuntimeError:  # no running event loop (e.g. sync worker context)
        return
    _pending_sends.add(task)
    task.add_done_callback(_pending_sends.discard)


def notify_booking_confirmed(reservation_id: int) -> None:
    """Call after the CONFIRMED status change is committed."""
    _schedule(reservation_id, "confirmed")


def notify_booking_cancelled(reservation_id: int) -> None:
    """Call after the CANCELLED status change is committed."""
    _schedule(reservation_id, "cancelled")
