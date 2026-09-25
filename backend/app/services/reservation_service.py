import datetime
from typing import Optional, List
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.reservation import Reservation, ReservationCapacityRule
from app.models.customer import Customer
from app.models.table import Table
from app.schemas.reservation import (
    ReservationCreate,
    ReservationUpdate,
    ReservationStatusUpdate,
    ReservationHoldRequest,
    ReservationHoldResponse,
    ReservationVerifyUpiRequest,
)
from app.workers.celery_app import celery_app, send_reservation_reminder

# Strict Allowed State Machine Map
ALLOWED_STATE_TRANSITIONS = {
    "HOLD": {"PAYMENT_PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"},
    "PAYMENT_PENDING": {"CONFIRMED", "CANCELLED", "EXPIRED"},
    "PENDING": {"CONFIRMED", "CANCELLED", "EXPIRED"},
    "CONFIRMED": {"ARRIVED", "CANCELLED", "NO_SHOW"},
    "ARRIVED": {"SEATED", "CANCELLED"},
    "SEATED": {"COMPLETED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
    "EXPIRED": set(),
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

        # Ensure table_id is valid in the tables table, or compute corresponding floor table ID
        valid_table_id = data.table_id
        if valid_table_id is not None:
            tbl_check = await db.execute(select(Table.id).where(Table.id == valid_table_id))
            if not tbl_check.scalar_one_or_none():
                # Attempt to map to floor-based table ID (e.g., Table 1 on Floor 2 -> id 6)
                if data.floor_number and data.table_name:
                    try:
                        digits = "".join(filter(str.isdigit, data.table_name))
                        t_num = int(digits) if digits else 1
                        computed_id = (data.floor_number - 1) * 5 + t_num
                        c_check = await db.execute(select(Table.id).where(Table.id == computed_id))
                        valid_table_id = computed_id if c_check.scalar_one_or_none() else None
                    except Exception:
                        valid_table_id = None
                else:
                    valid_table_id = None

        reservation = Reservation(
            branch_id=data.branch_id,
            customer_id=customer.id,
            guest_count=data.guest_count,
            reservation_date=data.reservation_date,
            time_slot=data.time_slot,
            table_id=valid_table_id,
            floor_number=data.floor_number or 1,
            table_name=data.table_name or "Table 1",
            status="CONFIRMED",
            payment_status=data.payment_status or "PAID",
            advance_amount=data.advance_amount if data.advance_amount is not None else 0.0,
            payment_reference=data.payment_reference,
            payment_method=data.payment_method or "UPI",
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

    @staticmethod
    async def checkin_reservation(
        db: AsyncSession, reservation_id: int, session_token: Optional[str] = None
    ) -> Reservation:
        """
        1-Tap Self Check-In via QR Scan:
        Transitions reservation from CONFIRMED -> ARRIVED -> SEATED.
        Links customer to active DiningSession and unlocks digital ordering.
        """
        from app.models.table import DiningSession

        reservation = await db.get(Reservation, reservation_id)
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        if reservation.status not in ["CONFIRMED", "ARRIVED", "SEATED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot check in reservation with status '{reservation.status}'.",
            )

        reservation.status = "SEATED"

        if session_token:
            sess_stmt = select(DiningSession).where(DiningSession.session_token == session_token)
            sess_res = await db.execute(sess_stmt)
            dining_session = sess_res.scalar_one_or_none()
            if dining_session:
                dining_session.customer_id = reservation.customer_id
                if dining_session.status == "OPENED":
                    dining_session.status = "ACTIVE"

        await db.commit()

        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.id == reservation.id)
        )
        return res.scalar_one()

    @staticmethod
    async def auto_release_expired_no_shows(db: AsyncSession) -> int:
        """
        15-Minute Grace Period & Auto-Release (No-Show Protection):
        Finds CONFIRMED reservations where slot_start + 15 min < current_time,
        and transitions them to NO_SHOW, freeing up tables for walk-ins.
        """
        from app.utils.helpers import calculate_reservation_window

        stmt = select(Reservation).where(Reservation.status == "CONFIRMED")
        res = await db.execute(stmt)
        reservations = res.scalars().all()
        released_count = 0

        for r in reservations:
            calc = calculate_reservation_window(r.reservation_date, r.time_slot)
            if calc.get("grace_exceeded"):
                r.status = "NO_SHOW"
                if r.celery_task_id:
                    try:
                        celery_app.control.revoke(r.celery_task_id, terminate=True)
                    except Exception:
                        pass
                    r.celery_task_id = None
                released_count += 1

        if released_count > 0:
            await db.commit()

        return released_count

    @staticmethod
    async def cleanup_expired_holds(db: AsyncSession) -> int:
        """
        Releases any HOLD reservations whose temporary hold_expires_at timer has elapsed.
        Transitions them to EXPIRED and payment_status to EXPIRED, instantly freeing up the table.
        """
        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        stmt = select(Reservation).where(
            Reservation.status.in_(["HOLD", "PAYMENT_PENDING"]),
            Reservation.hold_expires_at <= now,
        )
        res = await db.execute(stmt)
        expired_holds = res.scalars().all()
        count = len(expired_holds)
        for h in expired_holds:
            h.status = "EXPIRED"
            h.payment_status = "EXPIRED"
        if count > 0:
            await db.commit()
        return count

    @staticmethod
    async def hold_reservation(db: AsyncSession, data: ReservationHoldRequest) -> ReservationHoldResponse:
        """
        Temporarily holds a table slot for 7 minutes for direct 0% UPI payment.
        Validates availability, locks the table against conflicting holds, creates reservation with status=HOLD.
        """
        # 1. Clean up any expired holds first
        await ReservationService.cleanup_expired_holds(db)

        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

        # 2. Check if the specific table is already held or booked
        conflict_query = select(Reservation).where(
            Reservation.branch_id == data.branch_id,
            Reservation.reservation_date == data.reservation_date,
            Reservation.time_slot == data.time_slot,
            Reservation.floor_number == data.floor_number,
            Reservation.table_name == data.table_name,
            Reservation.status.in_(["HOLD", "PAYMENT_PENDING", "CONFIRMED", "ARRIVED", "SEATED"]),
        )
        conflict_res = await db.execute(conflict_query)
        conflict = conflict_res.scalar_one_or_none()

        if conflict:
            if conflict.status in ["HOLD", "PAYMENT_PENDING"] and conflict.hold_expires_at and conflict.hold_expires_at > now:
                remaining = int((conflict.hold_expires_at - now).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"SLOT_HELD: {data.table_name} on Floor {data.floor_number} is currently held by another guest. Hold expires in {remaining}s.",
                )
            elif conflict.status not in ["HOLD", "PAYMENT_PENDING"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"SLOT_BOOKED: {data.table_name} on Floor {data.floor_number} is already confirmed for {data.time_slot}.",
                )

        # 3. Check overall branch capacity
        capacity_ok = await ReservationService.check_capacity(
            db, data.branch_id, data.reservation_date, data.time_slot, data.guest_count
        )
        if not capacity_ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CAPACITY_EXCEEDED: This time slot is fully booked across the restaurant.",
            )

        # 4. Resolve table_id
        valid_table_id = data.table_id
        if valid_table_id is not None:
            tbl_check = await db.execute(select(Table.id).where(Table.id == valid_table_id))
            if not tbl_check.scalar_one_or_none():
                valid_table_id = None

        if valid_table_id is None and data.floor_number and data.table_name:
            try:
                digits = "".join(filter(str.isdigit, data.table_name))
                t_num = int(digits) if digits else 1
                computed_id = (data.floor_number - 1) * 5 + t_num
                c_check = await db.execute(select(Table.id).where(Table.id == computed_id))
                valid_table_id = computed_id if c_check.scalar_one_or_none() else None
            except Exception:
                valid_table_id = None

        # 5. Get or create Customer
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

        # 6. Set 7-minute hold expiration
        hold_duration_seconds = 420  # 7 minutes
        hold_expires_at = now + datetime.timedelta(seconds=hold_duration_seconds)
        advance_amount = float(data.guest_count * 200.0)
        from app.core.config import settings
        upi_merchant_id = settings.MERCHANT_UPI_ID
        merchant_encoded = settings.MERCHANT_NAME.replace(" ", "%20")

        reservation = Reservation(
            branch_id=data.branch_id,
            customer_id=customer.id,
            guest_count=data.guest_count,
            reservation_date=data.reservation_date,
            time_slot=data.time_slot,
            table_id=valid_table_id,
            floor_number=data.floor_number,
            table_name=data.table_name,
            status="HOLD",
            payment_status="PENDING",
            advance_amount=advance_amount,
            payment_method="UPI",
            upi_id=upi_merchant_id,
            hold_expires_at=hold_expires_at,
        )
        db.add(reservation)
        await db.commit()
        await db.refresh(reservation)

        # Standard NPCI UPI URI Scheme (works in GPay, PhonePe, Paytm, BHIM)
        upi_uri = f"upi://pay?pa={upi_merchant_id}&pn={merchant_encoded}&am={advance_amount:.2f}&cu=INR&tn=TableRes_{reservation.id}"

        return ReservationHoldResponse(
            reservation_id=reservation.id,
            hold_expires_at=hold_expires_at,
            seconds_remaining=hold_duration_seconds,
            advance_amount=advance_amount,
            upi_id=upi_merchant_id,
            upi_uri=upi_uri,
            qr_code_content=upi_uri,
            status="HOLD",
            floor_number=data.floor_number,
            table_name=data.table_name,
            reservation_date=data.reservation_date,
            time_slot=data.time_slot,
        )

    @staticmethod
    async def verify_upi_payment(
        db: AsyncSession, reservation_id: int, data: ReservationVerifyUpiRequest
    ) -> Reservation:
        """
        Verifies customer UPI payment.
        VULNERABILITY FIX: Customer-entered UTR NEVER self-confirms reservations.
        Confirmation strictly requires independent bank/acquirer settlement verification.
        UTR is recorded as a customer reconciliation reference while status is transitioned
        to PAYMENT_PENDING until verified bank credit arrives or hold elapses.
        """
        from sqlalchemy.orm import selectinload
        from app.services.payment_verification_service import PaymentVerificationService

        # 1. Clean up expired holds
        await ReservationService.cleanup_expired_holds(db)

        # 2. Acquire atomic row-level lock on the reservation to prevent race conditions & double-confirm
        stmt = (
            select(Reservation)
            .options(selectinload(Reservation.customer))
            .where(Reservation.id == reservation_id)
            .with_for_update()
        )
        res = await db.execute(stmt)
        reservation = res.scalar_one_or_none()

        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        # Idempotent return if already confirmed
        if reservation.status == "CONFIRMED":
            return reservation

        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        if reservation.status in ["HOLD", "PAYMENT_PENDING"] and reservation.hold_expires_at and reservation.hold_expires_at <= now:
            reservation.status = "EXPIRED"
            reservation.payment_status = "EXPIRED"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="HOLD_EXPIRED: Temporary hold elapsed before payment was verified. The table slot has been released.",
            )

        if reservation.status not in ["HOLD", "PAYMENT_PENDING", "PENDING"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot confirm reservation in status '{reservation.status}'.",
            )

        clean_utr = data.upi_utr.strip().replace(" ", "").replace("-", "")
        if len(clean_utr) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="INVALID_UTR: Please enter a valid UPI reference number / 12-digit UTR.",
            )

        # 3. Check if this UTR has already been confirmed/used by another reservation (prevent replay attacks)
        existing_utr_stmt = select(Reservation).where(
            Reservation.id != reservation.id,
            or_(
                func.lower(Reservation.upi_utr) == clean_utr.lower(),
                func.lower(Reservation.payment_reference) == clean_utr.lower(),
            ),
            Reservation.payment_status == "PAID",
        )
        existing_utr_res = await db.execute(existing_utr_stmt)
        existing_booking = existing_utr_res.scalars().first()
        if existing_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"UTR_ALREADY_USED: This UPI Reference / UTR '{clean_utr}' has already been used and exhausted for Booking #{existing_booking.id}. Each table reservation requires its own unique payment transaction.",
            )

        # 4. Transition to PAYMENT_PENDING and record customer UTR as reconciliation reference
        reservation.status = "PAYMENT_PENDING"
        reservation.payment_status = "PENDING_VERIFICATION"
        reservation.payment_reference = clean_utr
        reservation.upi_utr = clean_utr
        await db.flush()

        # 5. Strictly verify against trusted independent bank credit ledger
        try:
            await PaymentVerificationService.verify_and_claim_credit(
                db=db,
                reservation=reservation,
                utr=clean_utr,
            )
        except HTTPException:
            # Persist PAYMENT_PENDING and customer UTR for reconciliation; hold remains active until expiration
            await db.commit()
            raise

        # 6. Authentic bank credit confirmed! Transition to CONFIRMED & PAID
        reservation.status = "CONFIRMED"
        reservation.payment_status = "PAID"
        reservation.hold_expires_at = None

        await db.commit()
        await db.refresh(reservation)

        # Schedule Celery booking reminder
        try:
            task_result = send_reservation_reminder.apply_async(args=[reservation.id], countdown=3600)
            tid = getattr(task_result, "id", None)
            reservation.celery_task_id = str(tid) if tid is not None else None
            await db.commit()
        except Exception:
            pass

        return reservation

    @staticmethod
    async def cancel_hold(db: AsyncSession, reservation_id: int) -> Reservation:
        """
        Cancels an active temporary hold and immediately releases the table slot.
        """
        from sqlalchemy.orm import selectinload
        stmt = select(Reservation).options(selectinload(Reservation.customer)).where(Reservation.id == reservation_id)
        res = await db.execute(stmt)
        reservation = res.scalar_one_or_none()

        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        if reservation.status in ["HOLD", "PAYMENT_PENDING"]:
            reservation.status = "CANCELLED"
            reservation.payment_status = "CANCELLED"
            reservation.hold_expires_at = None
            await db.commit()
            await db.refresh(reservation)

        return reservation

    @staticmethod
    async def get_unavailable_tables(
        db: AsyncSession, branch_id: int, reservation_date: datetime.date, time_slot: str
    ) -> List[dict]:
        """
        Returns list of tables currently occupied or on active HOLD / PAYMENT_PENDING for the given date and time slot.
        """
        await ReservationService.cleanup_expired_holds(db)
        now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

        stmt = select(Reservation).where(
            Reservation.branch_id == branch_id,
            Reservation.reservation_date == reservation_date,
            Reservation.time_slot == time_slot,
            Reservation.status.in_(["HOLD", "PAYMENT_PENDING", "CONFIRMED", "ARRIVED", "SEATED"]),
        )
        res = await db.execute(stmt)
        active_res = res.scalars().all()

        unavailable = []
        for r in active_res:
            is_held = r.status in ["HOLD", "PAYMENT_PENDING"] and r.hold_expires_at and r.hold_expires_at > now
            if r.status in ["CONFIRMED", "ARRIVED", "SEATED"] or is_held:
                unavailable.append({
                    "floor_number": r.floor_number,
                    "table_name": r.table_name,
                    "status": "HELD" if is_held else "BOOKED",
                    "seconds_remaining": int((r.hold_expires_at - now).total_seconds()) if is_held and r.hold_expires_at else 0,
                })
        return unavailable

    @staticmethod
    async def process_bank_webhook(
        db: AsyncSession,
        utr: str,
        amount: float,
        merchant_vpa: str = settings.MERCHANT_UPI_ID,
        payer_vpa: Optional[str] = None,
        tx_status: str = "SETTLED",
        provider_source: str = "BANK_WEBHOOK",
    ) -> dict:
        """
        Receives authentic credit notification from bank/payment gateway.
        Records the verified credit in the database and automatically confirms
        any reservation waiting in PAYMENT_PENDING for this UTR.
        """
        from decimal import Decimal
        from app.services.payment_verification_service import PaymentVerificationService

        clean_utr = utr.strip().replace(" ", "").replace("-", "")
        credit = await PaymentVerificationService.record_verified_bank_credit(
            db=db,
            utr=clean_utr,
            amount=amount,
            merchant_vpa=merchant_vpa,
            payer_vpa=payer_vpa,
            tx_status=tx_status,
            provider_source=provider_source,
        )

        # Check if there is a reservation in PAYMENT_PENDING waiting for this UTR
        stmt = (
            select(Reservation)
            .where(
                Reservation.status == "PAYMENT_PENDING",
                func.lower(Reservation.upi_utr) == clean_utr.lower(),
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        reservation = res.scalars().first()

        confirmed_reservation_id = None
        if reservation and not credit.is_claimed and tx_status == "SETTLED":
            if credit.amount >= Decimal(str(reservation.advance_amount or 0.0)):
                credit.is_claimed = True
                credit.claimed_reservation_id = reservation.id
                reservation.status = "CONFIRMED"
                reservation.payment_status = "PAID"
                reservation.hold_expires_at = None
                await db.commit()
                confirmed_reservation_id = reservation.id

        return {
            "status": "SUCCESS",
            "utr": clean_utr,
            "credit_id": credit.id,
            "confirmed_reservation_id": confirmed_reservation_id,
        }

    @staticmethod
    async def staff_verify_payment(
        db: AsyncSession,
        reservation_id: int,
        utr: str,
        staff_username: str,
    ) -> Reservation:
        """
        Allows authorized staff/cashier to reconcile payment from merchant bank app/soundbox,
        recording an authorized bank credit and confirming the reservation.
        """
        from app.services.payment_verification_service import PaymentVerificationService

        clean_utr = utr.strip().replace(" ", "").replace("-", "")
        stmt = select(Reservation).where(Reservation.id == reservation_id).with_for_update()
        res = await db.execute(stmt)
        reservation = res.scalars().first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        advance = float(reservation.advance_amount or 0.0)
        await PaymentVerificationService.record_verified_bank_credit(
            db=db,
            utr=clean_utr,
            amount=advance,
            provider_source=f"STAFF_VERIFIED:{staff_username}",
            tx_status="SETTLED",
        )
        return await ReservationService.verify_upi_payment(
            db=db,
            reservation_id=reservation_id,
            data=ReservationVerifyUpiRequest(upi_utr=clean_utr),
        )

