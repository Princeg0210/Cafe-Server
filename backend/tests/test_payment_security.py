"""Booking payments in production mode: no simulated, unsigned, unpaid or underpaid bookings."""
import datetime
import hashlib
import hmac
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.reservation import RazorpayCreateOrderRequest, RazorpayVerifyPaymentRequest
from app.services import reservation_service as rs
from app.services.reservation_service import ReservationService

SECRET = "live_secret_for_tests"


def next_open_day():
    d = datetime.date.today() + datetime.timedelta(days=3)
    while d.weekday() in (1, 2):  # cafe closed Tue/Wed
        d += datetime.timedelta(days=1)
    return d


@pytest.fixture
def production(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "ALLOW_TEST_PAYMENTS", False)
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_live_testkey")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", SECRET)


def verify_request(payment_id="pay_ABC123", order_id="order_XYZ", signature=None, simulated=False, guests=2):
    if signature is None:
        signature = hmac.new(SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return RazorpayVerifyPaymentRequest(
        razorpay_order_id=order_id, razorpay_payment_id=payment_id, razorpay_signature=signature,
        customer_name="Asha", customer_phone="9351322209", guest_count=guests,
        reservation_date=next_open_day(), time_slot="07:00 PM",
        is_test_simulation=simulated,
    )


def fake_gateway(monkeypatch, payment):
    class Resp:
        status_code = 200

        def json(self):
            return payment

    class Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, *a, **k):
            return Resp()

    import httpx
    monkeypatch.setattr(httpx, "AsyncClient", Client)

    async def deposit(db):
        return Decimal("150.00")

    monkeypatch.setattr(rs.SettingsService, "get_deposit_per_guest", deposit)


async def expect_error(coro, code_fragment):
    with pytest.raises(HTTPException) as exc:
        await coro
    assert code_fragment in str(exc.value.detail)


async def test_simulated_payment_rejected_in_production(production):
    await expect_error(ReservationService.verify_razorpay_payment(None, verify_request(simulated=True)), "TEST_PAYMENT_REJECTED")
    await expect_error(ReservationService.verify_razorpay_payment(None, verify_request(payment_id="pay_test_1")), "TEST_PAYMENT_REJECTED")


async def test_wrong_signature_rejected_even_in_test_mode_flag(production, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_TEST_MODE", True)
    await expect_error(ReservationService.verify_razorpay_payment(None, verify_request(signature="bad")), "INVALID_RAZORPAY_SIGNATURE")


async def test_unpaid_payment_rejected(production, monkeypatch):
    fake_gateway(monkeypatch, {"order_id": "order_XYZ", "status": "failed", "amount": 30000})
    await expect_error(ReservationService.verify_razorpay_payment(None, verify_request()), "PAYMENT_NOT_COMPLETED")


async def test_payment_for_other_order_rejected(production, monkeypatch):
    fake_gateway(monkeypatch, {"order_id": "order_OTHER", "status": "captured", "amount": 30000})
    await expect_error(ReservationService.verify_razorpay_payment(None, verify_request()), "PAYMENT_NOT_COMPLETED")


async def test_underpaid_deposit_rejected(production, monkeypatch):
    # 4 guests need 600.00 but only 300.00 was paid
    fake_gateway(monkeypatch, {"order_id": "order_XYZ", "status": "captured", "amount": 30000})
    await expect_error(ReservationService.verify_razorpay_payment(None, verify_request(guests=4)), "PAYMENT_AMOUNT_MISMATCH")


async def test_create_order_refused_without_real_keys(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "ALLOW_TEST_PAYMENTS", False)
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_JaadooCafe10")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "jaadoo_secret_test_2026")

    async def deposit(db):
        return Decimal("150.00")

    monkeypatch.setattr(rs.SettingsService, "get_deposit_per_guest", deposit)
    req = RazorpayCreateOrderRequest(
        customer_name="Asha", customer_phone="9351322209", guest_count=2,
        reservation_date=next_open_day(), time_slot="07:00 PM",
    )
    await expect_error(ReservationService.create_razorpay_order(None, req), "PAYMENTS_NOT_CONFIGURED")


def test_test_payments_only_in_development(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "ALLOW_TEST_PAYMENTS", False)
    assert rs.test_payments_allowed() is False
    monkeypatch.setattr(settings, "APP_ENV", "development")
    assert rs.test_payments_allowed() is True


def test_bank_webhook_secret(monkeypatch):
    from app.api.v1.reservations import verify_bank_webhook_secret

    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "BANK_WEBHOOK_SECRET", None)
    with pytest.raises(HTTPException) as exc:
        verify_bank_webhook_secret(None)
    assert exc.value.status_code == 503  # disabled until configured

    monkeypatch.setattr(settings, "BANK_WEBHOOK_SECRET", "s3cret")
    for bad in (None, "wrong"):
        with pytest.raises(HTTPException) as exc:
            verify_bank_webhook_secret(bad)
        assert exc.value.status_code == 401
    assert verify_bank_webhook_secret("s3cret") is None

    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(settings, "BANK_WEBHOOK_SECRET", None)
    assert verify_bank_webhook_secret(None) is None  # local testing convenience


def test_android_listener_refuses_repo_default_credentials(monkeypatch):
    from app.api.v1.reservations import verify_device_auth

    default_token = "dev_token_jaadoo_android_phone_9460555743"
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "ANDROID_DEVICE_TOKEN", default_token)
    with pytest.raises(HTTPException):
        verify_device_auth(x_device_token=default_token, authorization=None, x_signature=None)

    monkeypatch.setattr(settings, "ANDROID_DEVICE_TOKEN", "real-device-token")
    verify_device_auth(x_device_token="real-device-token", authorization=None, x_signature=None)
    with pytest.raises(HTTPException):
        verify_device_auth(x_device_token="guess", authorization=None, x_signature=None)
