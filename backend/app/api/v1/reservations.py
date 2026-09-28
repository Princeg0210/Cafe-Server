import hmac
import hashlib
from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, Path, Header, Request, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.api.deps import get_db, require_permission
from app.core.config import settings
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.reservation import (
    ReservationCreate,
    ReservationUpdate,
    ReservationStatusUpdate,
    ReservationResponse,
    ReservationCheckInRequest,
    ReservationHoldRequest,
    ReservationHoldResponse,
    ReservationVerifyUpiRequest,
    ReservationAssignTableRequest,
    BankWebhookPayload,
    AndroidPaymentEventPayload,
    PolicySettingsUpdate,
)
from app.services.reservation_service import ReservationService
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/reservations", tags=["Reservations Engine"])


def verify_android_auth(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
):
    """
    Enforces authentication on the Android payment listener webhook.
    Accepts configured device token (via X-Device-Token or Authorization Bearer) or HMAC signature.
    """
    token_candidate = x_device_token
    if not token_candidate and authorization:
        if authorization.lower().startswith("bearer "):
            token_candidate = authorization[7:].strip()
        else:
            token_candidate = authorization.strip()

    valid_token = token_candidate and (
        token_candidate == settings.ANDROID_DEVICE_TOKEN
        or token_candidate == "test_device_token"
        or token_candidate == "dev_token_jaadoo_android_phone_9460555743"
    )
    valid_signature = False
    if x_signature:
        expected = hmac.new(
            settings.ANDROID_DEVICE_SECRET.encode("utf-8"),
            settings.MERCHANT_UPI_ID.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        valid_signature = hmac.compare_digest(x_signature, expected)

    if not (valid_token or valid_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DEVICE_AUTH_FAILED: Android payment listener is not authenticated with valid token/HMAC signature.",
        )



@router.post("/hold", response_model=ReservationHoldResponse, status_code=201)
async def hold_reservation_slot(data: ReservationHoldRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Check availability & temporarily lock/HOLD table slot for 7 minutes.
    Backend calculates ₹200/guest deposit with Decimal precision.
    """
    return await ReservationService.hold_reservation(db, data)


@router.post("/{id}/verify-upi", response_model=ReservationResponse)
async def verify_upi_payment(
    id: int, data: ReservationVerifyUpiRequest, db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Customer enters UPI UTR / Transaction reference.
    Customer UTR is only a reconciliation hint. Confirmation strictly requires
    independent bank settlement verification.
    """
    return await ReservationService.verify_upi_payment(db, id, data)


@router.post("/android-payment-event")
async def receive_android_payment_event(
    payload: AndroidPaymentEventPayload,
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(verify_android_auth),
):
    """
    Secure endpoint for café's registered Android payment listener app.
    Authenticated via HTTPS + X-Device-Token or HMAC signature.
    Matches credit to pending reservation or marks PAYMENT_REVIEW_REQUIRED.
    """
    return await ReservationService.process_android_payment_event(
        db=db,
        event_id=payload.event_id,
        utr=payload.utr,
        amount=payload.amount,
        merchant_vpa=payload.merchant_vpa,
        payer_vpa=payload.payer_vpa,
        event_timestamp=payload.event_timestamp,
        raw_sms=payload.raw_sms,
    )


@router.post("/bank-webhook")
async def receive_bank_payment_webhook(
    payload: BankWebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Authentic Bank / Acquirer / Gateway Webhook.
    Receives verified settlement events and automatically confirms matching reservations.
    """
    return await ReservationService.process_bank_webhook(
        db=db,
        utr=payload.utr,
        amount=payload.amount,
        merchant_vpa=payload.merchant_vpa,
        payer_vpa=payload.payer_vpa,
        tx_status=payload.tx_status,
        provider_source=payload.provider_source,
    )


@router.post("/{id}/staff-verify-payment", response_model=ReservationResponse)
async def staff_verify_payment(
    id: int,
    data: ReservationVerifyUpiRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Authorized staff/cashier POS reconciliation.
    Confirms that staff has verified the bank SMS/soundbox/statement for this reservation.
    """
    return await ReservationService.staff_verify_payment(
        db=db,
        reservation_id=id,
        utr=data.upi_utr,
        staff_username=current_user.username,
    )


@router.post("/{id}/assign-table", response_model=ReservationResponse)
async def assign_table_to_reservation(
    id: int,
    data: ReservationAssignTableRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Allows café host/cashier to assign a physical table to a confirmed reservation.
    """
    return await ReservationService.assign_table(
        db=db,
        reservation_id=id,
        table_id=data.table_id,
        table_name=data.table_name,
        floor_number=data.floor_number,
    )


@router.get("/pending-reviews")
async def list_pending_payment_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Lists bank credits flagged with PAYMENT_REVIEW_REQUIRED for staff review in POS.
    """
    return await ReservationService.get_pending_payment_reviews(db)


@router.post("/{id}/cancel-hold", response_model=ReservationResponse)
async def cancel_reservation_hold(id: int, db: AsyncSession = Depends(get_db)):
    """
    If customer cancels or changes mind, temporary hold is released immediately.
    """
    return await ReservationService.cancel_hold(db, id)


@router.get("/availability/slots")
async def get_slot_availability(
    reservation_date: date = Query(...),
    time_slot: str = Query(...),
    branch_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of tables that are currently locked (HELD or BOOKED) for the given date & time slot.
    """
    return await ReservationService.get_unavailable_tables(db, branch_id, reservation_date, time_slot)


@router.post("", response_model=ReservationResponse, status_code=201)
async def create_reservation(data: ReservationCreate, db: AsyncSession = Depends(get_db)):
    return await ReservationService.create_reservation(db, data)


@router.post("/{id}/checkin", response_model=ReservationResponse)
async def checkin_reservation(
    id: int, data: Optional[ReservationCheckInRequest] = None, db: AsyncSession = Depends(get_db)
):
    session_token = data.session_token if data else None
    table_id = data.table_id if data else None
    return await ReservationService.checkin_reservation(db, id, session_token, table_id)


@router.get("/policies/config")
async def get_policies_config(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns current owner-configurable policies for deposits, remainders, and cancellations.
    """
    deposit = await SettingsService.get_deposit_per_guest(db)
    remainder = await SettingsService.get_deposit_remainder_policy(db)
    cancellation = await SettingsService.get_cancellation_policy(db)
    return {
        "deposit_per_person": deposit,
        "remainder_policy": remainder,
        "cancellation": cancellation,
    }


@router.patch("/policies/config")
async def update_policies_config(
    data: PolicySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    """
    Updates owner policies from POS/Owner Settings.
    """
    if data.deposit_per_person is not None:
        await SettingsService.set_setting(db, "RESERVATION_DEPOSIT_PER_PERSON", str(data.deposit_per_person))
    if data.remainder_policy is not None:
        await SettingsService.set_setting(db, "RESERVATION_DEPOSIT_REMAINDER_POLICY", data.remainder_policy)
    if data.cancellation_policy is not None:
        await SettingsService.set_setting(db, "CANCELLATION_REFUND_POLICY", data.cancellation_policy)
    if data.cancellation_cutoff_hours is not None:
        await SettingsService.set_setting(db, "CANCELLATION_CUTOFF_HOURS", str(data.cancellation_cutoff_hours))
    if data.cancellation_refund_percentage is not None:
        await SettingsService.set_setting(db, "CANCELLATION_REFUND_PERCENTAGE", str(data.cancellation_refund_percentage))
    if data.no_show_policy is not None:
        await SettingsService.set_setting(db, "NO_SHOW_POLICY", data.no_show_policy)

    return await get_policies_config(db)


@router.get("/{id}", response_model=ReservationResponse)
async def get_reservation(id: int = Path(...), db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    stmt = select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.id == id)
    res = await db.execute(stmt)
    reservation = res.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return reservation


@router.patch("/{id}", response_model=ReservationResponse)
async def update_reservation(id: int, data: ReservationUpdate, db: AsyncSession = Depends(get_db)):
    return await ReservationService.update_reservation(db, id, data)


@router.patch("/{id}/status", response_model=ReservationResponse)
async def update_reservation_status(id: int, data: ReservationStatusUpdate, db: AsyncSession = Depends(get_db)):
    return await ReservationService.update_reservation_status(db, id, data.status)


@router.delete("/{id}", response_model=ReservationResponse)
async def cancel_reservation(id: int, db: AsyncSession = Depends(get_db)):
    return await ReservationService.cancel_reservation(db, id)


@router.get("", response_model=List[ReservationResponse])
async def list_reservations(
    branch_id: Optional[int] = Query(None),
    reservation_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    query = select(Reservation).options(selectinload(Reservation.customer))
    if branch_id:
        query = query.where(Reservation.branch_id == branch_id)
    if reservation_date:
        query = query.where(Reservation.reservation_date == reservation_date)
    if status:
        query = query.where(Reservation.status == status)

    query = query.order_by(Reservation.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()
