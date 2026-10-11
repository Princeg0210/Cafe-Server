"""Supplier bill scanning: Sarvam Document AI reads the bill, we match lines to raw materials.

Sarvam's Extract job returns supplier, bill number/date and line items reliably, but its
enum-based matching returned NONE for every line in testing, so matching to the cafe's raw
materials is done here by word overlap. Nothing is saved by scanning; the admin reviews the
draft and confirms it through the inventory confirm endpoint.
"""
import asyncio
import json
import re
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

POLL_INTERVAL_SECONDS = 2
POLL_TIMEOUT_SECONDS = 90
TERMINAL_STATUSES = {"completed", "partially_completed", "failed", "rejected"}

EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "supplier_name": {"type": "string", "description": "Name of the supplier / seller business at the top of the bill"},
        "bill_number": {"type": "string", "description": "Invoice or bill number"},
        "bill_date": {"type": "string", "description": "Invoice date, as YYYY-MM-DD"},
        "grand_total": {"type": "number", "description": "Final amount payable including taxes, in INR"},
        "line_items": {
            "type": "array",
            "description": "Every purchased item row in the bill table",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string", "description": "Item name exactly as printed"},
                    "quantity": {"type": "number", "description": "Quantity purchased"},
                    "unit": {"type": "string", "description": "Unit of quantity, e.g. kg, g, ltr, ml, pcs"},
                    "unit_price": {"type": "number", "description": "Rate per unit in INR, before tax"},
                    "amount": {"type": "number", "description": "Line amount in INR, before tax"},
                },
            },
        },
    },
}

UNIT_ALIASES = {
    "kg": "kg", "kgs": "kg", "kilo": "kg", "kilogram": "kg", "kilograms": "kg",
    "g": "g", "gm": "g", "gms": "g", "gram": "g", "grams": "g", "gr": "g",
    "l": "l", "lt": "l", "ltr": "l", "ltrs": "l", "litre": "l", "liter": "l", "litres": "l", "liters": "l",
    "ml": "ml", "mls": "ml", "millilitre": "ml", "milliliter": "ml",
    "pcs": "pcs", "pc": "pcs", "piece": "pcs", "pieces": "pcs", "nos": "pcs", "no": "pcs", "unit": "pcs",
    "units": "pcs", "btl": "pcs", "bottle": "pcs", "bottles": "pcs", "can": "pcs", "cans": "pcs",
    "pkt": "pcs", "packet": "pcs", "pack": "pcs", "box": "pcs", "dozen": "dozen", "dz": "dozen",
}
# Factor to convert a quantity in the first unit into the second unit
UNIT_FACTORS = {("kg", "g"): Decimal(1000), ("g", "kg"): Decimal("0.001"),
                ("l", "ml"): Decimal(1000), ("ml", "l"): Decimal("0.001"),
                ("dozen", "pcs"): Decimal(12)}

STOPWORDS = {"fresh", "the", "and", "of", "with", "pack", "pkt", "btl", "bottle", "block", "loose", "premium",
             "brand", "quality", "grade", "amul", "local"}


def is_configured() -> bool:
    return bool(settings.SARVAM_API_KEY)


def normalize_unit(unit: Optional[str]) -> str:
    u = re.sub(r"[^a-z]", "", (unit or "").lower())
    return UNIT_ALIASES.get(u, u)


def convert_quantity(qty: Decimal, from_unit: str, to_unit: str) -> Optional[Decimal]:
    """Quantity expressed in to_unit, or None when the units can't be converted."""
    f, t = normalize_unit(from_unit), normalize_unit(to_unit)
    if f == t or not f:
        return qty
    factor = UNIT_FACTORS.get((f, t))
    return (qty * factor).quantize(Decimal("0.0001")) if factor is not None else None


def _tokens(text: str) -> set:
    words = re.findall(r"[a-z]+", (text or "").lower())
    out = set()
    for w in words:
        if len(w) < 3 or w in STOPWORDS:
            continue
        if w.endswith("oes"):  # tomatoes -> tomato
            w = w[:-2]
        elif w.endswith("s") and not w.endswith("ss") and len(w) > 3:  # olives -> olive
            w = w[:-1]
        out.add(w)
    return out


def suggest_material(description: str, materials: List[Tuple[int, str]]) -> Tuple[Optional[int], float]:
    """Best raw material for a bill line by word overlap; (None, 0) when nothing fits well."""
    desc = _tokens(description)
    best_id, best_key = None, (0.0, 0)
    for mat_id, name in materials:
        mat = _tokens(name)
        if not mat or not desc:
            continue
        overlap = len(desc & mat)
        # Share of the material's words found on the bill line; ties go to the more specific match
        key = (overlap / len(mat), overlap)
        if overlap and key > best_key:
            best_id, best_key = mat_id, key
    best_score = best_key[0]
    return (best_id, round(best_score, 2)) if best_score >= 0.5 else (None, 0.0)


def _decimal(value) -> Optional[Decimal]:
    try:
        return Decimal(str(value)) if value is not None and str(value).strip() != "" else None
    except InvalidOperation:
        return None


def build_draft(result: dict, materials: List[Tuple[int, str, str]]) -> dict:
    """Turn Sarvam's extract result into a review draft with suggested material matches.

    materials: (id, name, unit_of_measure) for every raw material.
    """
    name_index = [(m[0], m[1]) for m in materials]
    unit_by_id = {m[0]: m[2] for m in materials}
    lines = []
    for row in result.get("line_items") or []:
        qty = _decimal(row.get("quantity"))
        unit_price = _decimal(row.get("unit_price"))
        amount = _decimal(row.get("amount"))
        if amount is None and qty is not None and unit_price is not None:
            amount = (qty * unit_price).quantize(Decimal("0.01"))
        mat_id, score = suggest_material(row.get("description") or "", name_index)
        stock_qty = None
        if mat_id and qty is not None:
            stock_qty = convert_quantity(qty, row.get("unit") or "", unit_by_id[mat_id])
        lines.append({
            "description": (row.get("description") or "").strip(),
            "quantity": qty,
            "unit": (row.get("unit") or "").strip(),
            "unit_price": unit_price,
            "amount": amount,
            "suggested_material_id": mat_id,
            "match_score": score,
            # Quantity in the material's own unit; None means the units need a manual check
            "stock_quantity": stock_qty,
        })
    return {
        "supplier_name": (result.get("supplier_name") or "").strip() or None,
        "bill_number": (result.get("bill_number") or "").strip() or None,
        "bill_date": (result.get("bill_date") or "").strip() or None,
        "grand_total": _decimal(result.get("grand_total")),
        "lines": lines,
    }


async def extract_bill(content: bytes, filename: str, content_type: str) -> dict:
    """Run a Sarvam Document AI Extract job on the bill using Sarvam Vision OCR and return its `result` object."""
    if not is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Bill scanning is not configured (SARVAM_API_KEY missing).")

    # Normalize content_type if missing or generic
    if not content_type or content_type == "application/octet-stream":
        ext = filename.lower().split(".")[-1]
        if ext in ("jpg", "jpeg"):
            content_type = "image/jpeg"
        elif ext == "png":
            content_type = "image/png"
        elif ext == "pdf":
            content_type = "application/pdf"
        elif ext == "webp":
            content_type = "image/webp"

    headers = {"api-subscription-key": settings.SARVAM_API_KEY}
    base = settings.SARVAM_BASE_URL.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            created = await client.post(
                f"{base}/doc-ai/v1/job/extract",
                headers=headers,
                files={"file": (filename, content, content_type)},
                data={"schema": json.dumps(EXTRACT_SCHEMA), "language": "en-IN", "output_format": "json"},
            )
            if created.status_code >= 400:
                try:
                    err_json = created.json()
                    err_msg = err_json.get("detail") or err_json.get("message") or f"Bill reader rejected the file ({created.status_code})"
                except Exception:
                    err_msg = f"Bill reader rejected the file ({created.status_code})"
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Sarvam AI: {err_msg}")

            job_id = created.json().get("job_id")
            if not job_id:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Bill reader did not return a valid job ID.")

            waited = 0
            job_status = None
            while waited < POLL_TIMEOUT_SECONDS:
                status_res = await client.get(f"{base}/doc-ai/v1/job/{job_id}/status", headers=headers)
                if status_res.status_code == 200:
                    job_status = status_res.json().get("status")
                    if job_status in TERMINAL_STATUSES:
                        break
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                waited += POLL_INTERVAL_SECONDS

            if job_status not in ("completed", "partially_completed"):
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT if job_status not in TERMINAL_STATUSES else status.HTTP_502_BAD_GATEWAY,
                    detail="Could not read the bill. Try a clearer photo." if job_status in TERMINAL_STATUSES else "Bill reading timed out. Please try again.",
                )

            res = await client.get(f"{base}/doc-ai/v1/job/{job_id}/results", headers=headers)
            if res.status_code >= 400:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not fetch the bill reading result.")
            data = res.json()
            return data.get("result") or data.get("data") or data or {}
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not reach Sarvam AI bill reader ({str(exc)}). Please try again.")
