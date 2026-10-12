"""WhatsApp notification service: number formatting, payload shape, no-op when unconfigured, send call."""
import pytest

from app.core.config import settings
from app.services import whatsapp_service as wa


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("9351322209", "919351322209"),
        ("+91 93513 22209", "919351322209"),
        ("09351322209", "919351322209"),
        ("919351322209", "919351322209"),
        ("+44 7911 123456", "447911123456"),
        ("12345", None),
        ("", None),
        (None, None),
    ],
)
def test_normalize_phone(raw, expected):
    assert wa.normalize_phone(raw) == expected


def test_build_template_payload():
    payload = wa.build_template_payload("919351322209", "booking_confirmation", ["Asha", 2])
    assert payload["to"] == "919351322209"
    assert payload["template"]["name"] == "booking_confirmation"
    assert payload["template"]["components"][0]["parameters"] == [
        {"type": "text", "text": "Asha"},
        {"type": "text", "text": "2"},
    ]


async def test_send_is_noop_when_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ACCESS_TOKEN", None)
    monkeypatch.setattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None)

    class Boom:
        def __init__(self, *a, **k):
            raise AssertionError("must not call the network when unconfigured")

    monkeypatch.setattr(wa.httpx, "AsyncClient", Boom)
    assert await wa.send_template("9351322209", "booking_confirmation", ["x"]) is False
    wa.notify_booking_confirmed(1)  # must not raise or schedule anything
    assert not wa._pending_sends


async def test_send_posts_template_to_cloud_api(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ACCESS_TOKEN", "test-token")
    monkeypatch.setattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "12345")
    calls = []

    class FakeResponse:
        status_code = 200
        text = "{}"

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, headers=None, json=None):
            calls.append((url, headers, json))
            return FakeResponse()

    monkeypatch.setattr(wa.httpx, "AsyncClient", FakeClient)
    ok = await wa.send_template("93513 22209", "booking_cancellation", ["Asha", "ASHA0001"])
    assert ok is True
    url, headers, body = calls[0]
    assert url.endswith("/12345/messages")
    assert headers["Authorization"] == "Bearer test-token"
    assert body["to"] == "919351322209"
    assert body["template"]["name"] == "booking_cancellation"


async def test_send_reports_api_error(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ACCESS_TOKEN", "test-token")
    monkeypatch.setattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "12345")

    class FakeResponse:
        status_code = 400
        text = '{"error":"template not approved"}'

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, *a, **k):
            return FakeResponse()

    monkeypatch.setattr(wa.httpx, "AsyncClient", FakeClient)
    assert await wa.send_template("9351322209", "booking_confirmation", ["x"]) is False
