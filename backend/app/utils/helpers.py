import datetime
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any

IST = ZoneInfo("Asia/Kolkata")


def utc_now() -> datetime.datetime:
    """Returns naive UTC datetime for SQLAlchemy DateTime compatibility without deprecation warnings."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def ist_now() -> datetime.datetime:
    """Returns current datetime in Asia/Kolkata timezone."""
    return datetime.datetime.now(IST)


def parse_time_slot_to_datetime(
    reservation_date: datetime.date, time_slot: str, tz: ZoneInfo = IST
) -> Optional[datetime.datetime]:
    """Parses various time slot string formats (e.g. '19:30', '19:00-20:00', '7:30 PM') into a datetime in IST."""
    if not time_slot:
        return None
    clean = time_slot.strip().split("-")[0].strip()
    for fmt in ("%I:%M %p", "%I:%M%p", "%I %p", "%I%p", "%H:%M", "%H:%M:%S"):
        try:
            slot_time = datetime.datetime.strptime(clean, fmt).time()
            return datetime.datetime.combine(reservation_date, slot_time, tzinfo=tz)
        except ValueError:
            pass
    return None


def calculate_reservation_window(
    reservation_date: datetime.date, time_slot: str, current_dt: Optional[datetime.datetime] = None
) -> Dict[str, Any]:
    """
    Computes time-window status:
    - is_within_alert_window: True if within 90 minutes before start and not past grace period.
    - grace_exceeded: True if > 15 minutes past start time (triggers auto NO_SHOW).
    - can_quick_dine: True if between 30 and 90 minutes before start.
    - quick_dine_minutes: Recommended max minutes for a quick dine session (leaving 15m buffer).
    - minutes_until: Minutes until reservation starts (can be negative if in grace period).
    """
    now = current_dt or ist_now()
    slot_dt = parse_time_slot_to_datetime(reservation_date, time_slot, tz=IST)
    if not slot_dt:
        return {
            "valid": False,
            "is_within_alert_window": True,  # Fallback to show if unparseable
            "grace_exceeded": False,
            "can_quick_dine": False,
            "quick_dine_minutes": None,
            "minutes_until": None,
        }

    diff_minutes = (slot_dt - now).total_seconds() / 60.0
    is_today = (reservation_date == now.date())
    is_past_date = (reservation_date < now.date())
    is_future_date = (reservation_date > now.date())

    grace_exceeded = is_past_date or (is_today and diff_minutes < -15.0)
    is_within_alert_window = is_today and (-15.0 <= diff_minutes <= 90.0)
    can_quick_dine = is_today and (30.0 <= diff_minutes <= 90.0)
    quick_dine_minutes = max(15, int(diff_minutes - 15)) if can_quick_dine else None

    return {
        "valid": True,
        "is_today": is_today,
        "is_past_date": is_past_date,
        "is_future_date": is_future_date,
        "diff_minutes": diff_minutes,
        "minutes_until": max(0, int(diff_minutes)) if diff_minutes >= 0 else 0,
        "grace_exceeded": grace_exceeded,
        "is_within_alert_window": is_within_alert_window,
        "can_quick_dine": can_quick_dine,
        "quick_dine_minutes": quick_dine_minutes,
    }
