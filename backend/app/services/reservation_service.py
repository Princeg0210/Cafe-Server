import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.reservation import Reservation, ReservationCapacityRule
from app.models.customer import Customer
from app.schemas.reservation import ReservationCreate


class ReservationService:
    @staticmethod
    async def check_capacity(
        db: AsyncSession, branch_id: int, reservation_date: datetime.date, time_slot: str, new_guests: int
    ) -> bool:
        # Fetch capacity rule for branch & time_slot
        rule_query = select(ReservationCapacityRule).where(
            ReservationCapacityRule.branch_id == branch_id,
            ReservationCapacityRule.time_slot == time_slot,
            ReservationCapacityRule.is_active == True,
        )
        rule_result = await db.execute(rule_query)
        rule = rule_result.scalar_one_or_none()

        max_capacity = rule.max_guest_capacity if rule else 80

        # Calculate current booked guest total for the branch, date, and slot
        booked_query = select(func.coalesce(func.sum(Reservation.guest_count), 0)).where(
            Reservation.branch_id == branch_id,
            Reservation.reservation_date == reservation_date,
            Reservation.time_slot == time_slot,
            Reservation.status == "CONFIRMED",
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
        await db.commit()
        await db.refresh(reservation)
        return reservation
