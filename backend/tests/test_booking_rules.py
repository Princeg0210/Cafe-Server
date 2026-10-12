"""Booking rules: no past dates, closed days, impossible times or bad phone numbers."""
import datetime

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.reservation_service import validate_booking_request


def next_day(weekday_ok=True):
    d = datetime.date.today() + datetime.timedelta(days=2)
    while (d.weekday() in (1, 2)) == weekday_ok:
        d += datetime.timedelta(days=1)
    return d


@pytest.fixture(autouse=True)
def enforced(monkeypatch):
    monkeypatch.setattr(settings, "BOOKING_RULES_ENFORCED", True)
    monkeypatch.setattr(settings, "RESERVATION_CLOSED_WEEKDAYS", "1,2")


@pytest.mark.parametrize("slot", ["07:00 PM", "08:15 PM", "09:15 PM", "19:00", "19:00-20:00"])
def test_valid_bookings_pass(slot):
    validate_booking_request(next_day(), slot, "+91 93513 22209")


@pytest.mark.parametrize(
    "date_fn, slot, phone, code",
    [
        (lambda: datetime.date.today() - datetime.timedelta(days=2), "07:00 PM", "9351322209", "INVALID_DATE"),
        (lambda: next_day(weekday_ok=False), "07:00 PM", "9351322209", "CLOSED_DAY"),
        (next_day, "banana", "9351322209", "INVALID_TIME"),
        (next_day, "03:00 AM", "9351322209", "INVALID_TIME"),
        (next_day, "11:45 PM", "9351322209", "INVALID_TIME"),
        (next_day, "07:00 PM", "abc", "INVALID_PHONE"),
        (next_day, "07:00 PM", "12345", "INVALID_PHONE"),
        (next_day, "07:00 PM", "1234567890", "INVALID_PHONE"),
    ],
)
def test_invalid_bookings_rejected(date_fn, slot, phone, code):
    with pytest.raises(HTTPException) as exc:
        validate_booking_request(date_fn(), slot, phone)
    assert code in exc.value.detail


def test_rules_can_be_switched_off(monkeypatch):
    monkeypatch.setattr(settings, "BOOKING_RULES_ENFORCED", False)
    validate_booking_request(datetime.date(2000, 1, 1), "banana", "abc")
