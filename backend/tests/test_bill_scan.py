"""Bill scanning: unit handling, material matching and draft building (Sarvam faked)."""
from decimal import Decimal

import pytest

from app.services import bill_scan_service as bs

MATERIALS = [
    (1, "Mozzarella", "kg"),
    (2, "Fresh Basil", "kg"),
    (3, "Cherry Tomatoes", "kg"),
    (4, "Green Tomatoes", "kg"),
    (5, "Extra Virgin Olive Oil", "l"),
    (6, "Olives", "kg"),
    (7, "Feta Cheese", "kg"),
    (8, "Coke", "pcs"),
]

# Shape of a real Sarvam Extract `result` (from a test call on a sample supplier bill)
SARVAM_RESULT = {
    "supplier_name": "SHREE GANESH TRADERS",
    "bill_number": "SGT/2026/0457",
    "bill_date": "2026-10-09",
    "grand_total": 6174,
    "line_items": [
        {"description": "Amul Mozzarella Cheese Block", "quantity": 5, "unit": "kg", "unit_price": 420, "amount": 2100},
        {"description": "Fresh Basil Leaves", "quantity": 0.5, "unit": "kg", "unit_price": 300, "amount": 150},
        {"description": "Cherry Tomato", "quantity": 2, "unit": "kg", "unit_price": 160, "amount": 320},
        {"description": "Extra Virgin Olive Oil (1L btl)", "quantity": 3, "unit": "ltr", "unit_price": 850, "amount": 2550},
        {"description": "Paneer Fresh", "quantity": 2, "unit": "kg", "unit_price": 380, "amount": 760},
    ],
}


@pytest.mark.parametrize("raw, unit", [("ltr", "l"), ("Kgs", "kg"), ("gms", "g"), ("Nos.", "pcs"), ("btl", "pcs"), ("ml", "ml")])
def test_normalize_unit(raw, unit):
    assert bs.normalize_unit(raw) == unit


@pytest.mark.parametrize(
    "qty, frm, to, out",
    [
        ("500", "g", "kg", Decimal("0.5")),
        ("2", "kg", "g", Decimal("2000")),
        ("750", "ml", "ltr", Decimal("0.75")),
        ("3", "ltr", "l", Decimal("3")),
        ("2", "dozen", "pcs", Decimal("24")),
        ("2", "kg", "pcs", None),
    ],
)
def test_convert_quantity(qty, frm, to, out):
    assert bs.convert_quantity(Decimal(qty), frm, to) == out


def test_matching_prefers_specific_material():
    names = [(m[0], m[1]) for m in MATERIALS]
    assert bs.suggest_material("Extra Virgin Olive Oil (1L btl)", names)[0] == 5  # not "Olives"
    assert bs.suggest_material("Black Olives", names)[0] == 6
    assert bs.suggest_material("Cherry Tomato", names)[0] == 3  # not "Green Tomatoes"
    assert bs.suggest_material("Amul Mozzarella Cheese Block", names)[0] == 1  # not "Feta Cheese"
    assert bs.suggest_material("Paneer Fresh", names) == (None, 0.0)


def test_build_draft_from_real_result_shape():
    draft = bs.build_draft(SARVAM_RESULT, MATERIALS)
    assert draft["supplier_name"] == "SHREE GANESH TRADERS"
    assert draft["bill_number"] == "SGT/2026/0457"
    assert draft["bill_date"] == "2026-10-09"
    assert draft["grand_total"] == Decimal("6174")
    matched = [(l["description"], l["suggested_material_id"], l["stock_quantity"]) for l in draft["lines"]]
    assert matched == [
        ("Amul Mozzarella Cheese Block", 1, Decimal("5")),
        ("Fresh Basil Leaves", 2, Decimal("0.5")),
        ("Cherry Tomato", 3, Decimal("2")),
        ("Extra Virgin Olive Oil (1L btl)", 5, Decimal("3")),
        ("Paneer Fresh", None, None),
    ]


def test_build_draft_converts_grams_and_flags_unconvertible():
    draft = bs.build_draft(
        {"line_items": [
            {"description": "Mozzarella", "quantity": 500, "unit": "gm", "amount": 210},
            {"description": "Coke 300ml", "quantity": 2, "unit": "kg", "amount": 80},
        ]},
        MATERIALS,
    )
    assert draft["lines"][0]["stock_quantity"] == Decimal("0.5")  # 500 g -> 0.5 kg
    assert draft["lines"][1]["suggested_material_id"] == 8
    assert draft["lines"][1]["stock_quantity"] is None  # kg -> pcs needs a manual check


async def test_extract_refuses_when_not_configured(monkeypatch):
    from fastapi import HTTPException
    from app.core.config import settings

    monkeypatch.setattr(settings, "SARVAM_API_KEY", None)
    with pytest.raises(HTTPException) as exc:
        await bs.extract_bill(b"x", "bill.pdf", "application/pdf")
    assert exc.value.status_code == 503
