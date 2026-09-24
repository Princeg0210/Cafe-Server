from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.models.reservation import Reservation
from app.schemas.reservation import (
    ReservationCreate,
    ReservationUpdate,
    ReservationStatusUpdate,
    ReservationResponse,
    ReservationCheckInRequest,
)
from app.services.reservation_service import ReservationService

router = APIRouter(prefix="/reservations", tags=["Reservations Engine"])


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

