from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.api.deps import get_db
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
    BankWebhookPayload,
)
from app.services.reservation_service import ReservationService

router = APIRouter(prefix="/reservations", tags=["Reservations Engine"])


@router.post("/hold", response_model=ReservationHoldResponse, status_code=201)
async def hold_reservation_slot(data: ReservationHoldRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Check availability & temporarily lock/HOLD table slot for 7 minutes.
    Generates dynamic 0% fee UPI intent details.
    """
    return await ReservationService.hold_reservation(db, data)


@router.post("/{id}/verify-upi", response_model=ReservationResponse)
async def verify_upi_payment(
    id: int, data: ReservationVerifyUpiRequest, db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Customer enters UPI UTR / Transaction reference.
    Backend transitions reservation to PAYMENT_PENDING and checks for independent bank settlement.
    """
    return await ReservationService.verify_upi_payment(db, id, data)


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
    return await ReservationService.checkin_reservation(db, id, session_token)


@router.get("/{id}", response_model=ReservationResponse)
async def get_reservation(id: int = Path(...), db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    stmt = select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.id == id)
    res = await db.execute(stmt)
    reservation = res.scalar_one_or_none()
    if not reservation:
        from fastapi import HTTPException, status
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

