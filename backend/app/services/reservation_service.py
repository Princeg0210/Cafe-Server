import datetime
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.reservation import Reservation, ReservationCapacityRule
from app.models.customer import Customer
from app.schemas.reservation import ReservationCreate, ReservationUpdate, ReservationStatusUpdate
from app.workers.celery_app import celery_app, send_reservation_reminder

# Strict Allowed State Machine Map
ALLOWED_STATE_TRANSITIONS = {
    "PENDING": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"ARRIVED", "CANCELLED", "NO_SHOW"},
    "ARRIVED": {"SEATED", "CANCELLED"},
    "SEATED": {"COMPLETED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
    "NO_SHOW": set(),
}


class ReservationService:
    @staticmethod
    async def check_capacity(
        db: AsyncSession, branch_id: int, reservation_date: datetime.date, time_slot: str, new_guests: int
    ) -> bool:
        # Fetch capacity rule for branch & time_slot with pessimistic row locking
        rule_query = (
            select(ReservationCapacityRule)
            .where(
                ReservationCapacityRule.branch_id == branch_id,
                ReservationCapacityRule.time_slot == time_slot,
                ReservationCapacityRule.is_active == True,
            )
            .with_for_update()
        )
        rule_result = await db.execute(rule_query)
        rule = rule_result.scalar_one_or_none()

        max_capacity = rule.max_guest_capacity if rule else 80

        # Calculate booked count considering only active statuses (PENDING, CONFIRMED, ARRIVED, SEATED)
        # Excludes CANCELLED, COMPLETED, NO_SHOW
        booked_query = select(func.coalesce(func.sum(Reservation.guest_count), 0)).where(
            Reservation.branch_id == branch_id,
            Reservation.reservation_date == reservation_date,
            Reservation.time_slot == time_slot,
            Reservation.status.in_(["PENDING", "CONFIRMED", "ARRIVED", "SEATED"]),
        )
        booked_result = await db.execute(booked_query)
        current_booked = booked_result.scalar() or 0

        if current_booked + new_guests > max_capacity:
            return False
        return True

    @staticmethod
    async def create_reservation(db: AsyncSession, data: ReservationCreate) -> Reservation:
        # Check capacity
        has_capacity = await ReservationService.check_capacity(
            db, data.branch_id, data.reservation_date, data.time_slot, data.guest_count
        )
        if not has_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RESERVATION_CAPACITY_EXCEEDED: Requested time slot is fully booked.",
            )

        # Get or create customer by phone
        cust_query = select(Customer).where(Customer.phone == data.customer_phone)
        cust_result = await db.execute(cust_query)
        customer = cust_result.scalar_one_or_none()

        if not customer:
            customer = Customer(
                name=data.customer_name,
                phone=data.customer_phone,
                email=data.customer_email,
            )
            db.add(customer)
            await db.flush()

        reservation = Reservation(
            branch_id=data.branch_id,
            customer_id=customer.id,
            guest_count=data.guest_count,
            reservation_date=data.reservation_date,
            time_slot=data.time_slot,
            status="CONFIRMED",
        )
        db.add(reservation)
        await db.flush()

        # Schedule Celery booking reminder task
        try:
            task_result = send_reservation_reminder.apply_async(
                args=[reservation.id],
                countdown=3600,  # Configurable 60 mins lead time
            )
            reservation.celery_task_id = task_result.id
        except Exception:
            reservation.celery_task_id = None

        await db.commit()
        
        # Reload with selectinload for customer relationship
        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.id == reservation.id)
        )
        return res.scalar_one()

    @staticmethod
    async def update_reservation_status(db: AsyncSession, reservation_id: int, new_status: str) -> Reservation:
        reservation = await db.get(Reservation, reservation_id)
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        current_status = reservation.status
        allowed = ALLOWED_STATE_TRANSITIONS.get(current_status, set())

        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INVALID_STATUS_TRANSITION: Cannot transition reservation status from '{current_status}' to '{new_status}'.",
            )

        reservation.status = new_status

        # If cancelled or no-show, revoke Celery reminder task if present
        if new_status in ["CANCELLED", "NO_SHOW"] and reservation.celery_task_id:
            try:
                celery_app.control.revoke(reservation.celery_task_id, terminate=True)
            except Exception:
                pass
            reservation.celery_task_id = None

        await db.commit()

        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.id == reservation.id)
        )
        return res.scalar_one()


    @staticmethod
    async def update_reservation(db: AsyncSession, reservation_id: int, data: ReservationUpdate) -> Reservation:
        reservation = await db.get(Reservation, reservation_id)
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        # If date, time slot, or guest count changes, re-check capacity
        new_date = data.reservation_date or reservation.reservation_date
        new_slot = data.time_slot or reservation.time_slot
        new_guests = data.guest_count or reservation.guest_count

        if new_date != reservation.reservation_date or new_slot != reservation.time_slot or new_guests != reservation.guest_count:
            # Check capacity ignoring current reservation's guest count
            rule_query = (
                select(ReservationCapacityRule)
                .where(
                    ReservationCapacityRule.branch_id == reservation.branch_id,
                    ReservationCapacityRule.time_slot == new_slot,
                    ReservationCapacityRule.is_active == True,
                )
                .with_for_update()
            )
            rule_res = await db.execute(rule_query)
            rule = rule_res.scalar_one_or_none()
            max_capacity = rule.max_guest_capacity if rule else 80

            booked_query = select(func.coalesce(func.sum(Reservation.guest_count), 0)).where(
                Reservation.branch_id == reservation.branch_id,
                Reservation.reservation_date == new_date,
                Reservation.time_slot == new_slot,
                Reservation.status.in_(["PENDING", "CONFIRMED", "ARRIVED", "SEATED"]),
                Reservation.id != reservation_id,
            )
            booked_res = await db.execute(booked_query)
            current_booked = booked_res.scalar() or 0

            if current_booked + new_guests > max_capacity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="RESERVATION_CAPACITY_EXCEEDED: Rescheduled time slot is fully booked.",
                )

            # Revoke previous Celery reminder task when rescheduled
            if reservation.celery_task_id:
                try:
                    celery_app.control.revoke(reservation.celery_task_id, terminate=True)
                except Exception:
                    pass
                reservation.celery_task_id = None

            reservation.reservation_date = new_date
            reservation.time_slot = new_slot
            reservation.guest_count = new_guests

            # Schedule new reminder task
            try:
                task_res = send_reservation_reminder.apply_async(args=[reservation.id], countdown=3600)
                reservation.celery_task_id = task_res.id
            except Exception:
                pass

        if data.status:
            return await ReservationService.update_reservation_status(db, reservation_id, data.status)

        await db.commit()
        await db.refresh(reservation)
        return reservation

    @staticmethod
    async def cancel_reservation(db: AsyncSession, reservation_id: int) -> Reservation:
        return await ReservationService.update_reservation_status(db, reservation_id, "CANCELLED")
