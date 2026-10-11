import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_permission
from app.models.user import User
from app.schemas.pos import KOTResponse, POSSummaryResponse, SessionDiscountRequest, SettleRequest, TableOverviewResponse
from app.services.billing_service import BillingService
from app.services.pos_service import POSService

router = APIRouter(prefix="/pos", tags=["Live POS & KOT Operations"])


@router.get("/kots", response_model=List[KOTResponse])
async def list_kots(
    target_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    date_obj = None
    if target_date:
        try:
            date_obj = datetime.date.fromisoformat(target_date)
        except ValueError:
            date_obj = None
    return await POSService.get_kots(db, target_date=date_obj, limit=limit)


@router.get("/summary", response_model=POSSummaryResponse)
async def get_pos_summary(
    target_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    date_obj = None
    if target_date:
        try:
            date_obj = datetime.date.fromisoformat(target_date)
        except ValueError:
            date_obj = None
    return await POSService.get_summary(db, target_date=date_obj)


@router.get("/table-sessions", response_model=List[TableOverviewResponse])
async def list_table_sessions(
    target_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    date_obj = None
    if target_date:
        try:
            date_obj = datetime.date.fromisoformat(target_date)
        except ValueError:
            date_obj = None
    return await POSService.get_table_sessions(db, target_date=date_obj)


@router.post("/kots/{id}/claim-print")
async def claim_kot_print(
    id: int,
    force: bool = Query(False, description="Reprint even if already printed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    """Claim a KOT for printing on this device (prevents duplicate prints) and get its ticket."""
    return await POSService.claim_kot_print(db, kot_id=id, force=force)


@router.post("/kots/{id}/printed")
async def mark_kot_printed(
    id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    return await POSService.mark_kot_printed(db, kot_id=id, success=bool(payload.get("success", True)))


@router.post("/kots/{id}/retry-print")
async def retry_kot_print(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    return await POSService.retry_kot_print(db, kot_id=id)


@router.post("/sessions/{id}/close")
async def close_session(
    id: int,
    payload: Optional[SettleRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    return await POSService.close_dining_session(db, session_id=id, payment_mode=payload.payment_mode if payload else None)


@router.post("/tables/{table_id}/settle")
async def settle_table(
    table_id: int,
    payload: Optional[SettleRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    return await POSService.settle_table_by_id(db, table_id=table_id, payment_mode=payload.payment_mode if payload else None)


@router.post("/tables/merge")
async def merge_tables(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    source_table_id = int(payload.get("source_table_id", 0))
    target_table_id = int(payload.get("target_table_id", 0))
    return await POSService.merge_tables(db, source_table_id=source_table_id, target_table_id=target_table_id)


@router.post("/walk-in/seat")
async def seat_walk_in(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    try:
        table_id = int(payload.get("table_id") or 0)
        guest_count = payload.get("guest_count")
        guest_count = int(guest_count) if guest_count not in (None, "") else None
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Table and guest count must be numbers.")
    if guest_count is not None and not 1 <= guest_count <= 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guest count must be between 1 and 20.")
    return await POSService.seat_walk_in(
        db,
        table_id=table_id,
        customer_name=payload.get("customer_name"),
        guest_count=guest_count,
    )


@router.put("/sessions/{id}/items")
async def update_session_items(
    id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    items = payload.get("items", [])
    return await POSService.update_session_items(db, session_id=id, items=items)


@router.put("/sessions/{id}/discount")
async def set_session_discount(
    id: int,
    payload: SessionDiscountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    """Apply (or clear) a % or flat discount on an open bill; capped at 10% of the subtotal, before GST."""
    bill = await BillingService.set_session_discount(
        db,
        dining_session_id=id,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        reason=payload.reason,
        user_id=current_user.id,
    )
    return {
        "bill_id": bill.id,
        "subtotal": bill.subtotal,
        "discount_type": bill.discount_type,
        "discount_value": bill.discount_value,
        "discount_amount": bill.discount_amount,
        "discount_reason": bill.discount_reason,
        "tax_amount": bill.tax_amount,
        "gross_amount": bill.subtotal - bill.discount_amount + bill.tax_amount,
        "reservation_credit": bill.reservation_credit,
        "net_amount_due": bill.total_amount,
    }


@router.post("/sessions/reset-all")
async def reset_all_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    return await POSService.reset_all_sessions(db)


@router.get("/daily-dough-capacity")
async def get_daily_dough_capacity(
    branch_id: int = Query(1, description="Branch ID"),
    target_date: Optional[str] = Query(None, description="Format YYYY-MM-DD (default: today)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    """
    Returns today's pizza dough production capacity for the POS dashboard.

    Example response:
      {
        "total_dough_limit": 70,
        "total_allocated_dough": 25,
        "total_active_protected": 15,
        "walk_in_available": 30
      }

    DAILY PIZZA CAPACITY
    70 Total | 25 Used | 15 Protected | 30 Walk-in Available
    """
    from app.services.capacity_service import CapacityService
    date_obj = None
    if target_date:
        try:
            date_obj = datetime.date.fromisoformat(target_date)
        except ValueError:
            date_obj = None
    return await CapacityService.get_daily_dough_overview(db, branch_id=branch_id, target_date=date_obj)
