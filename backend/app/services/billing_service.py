from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.config import settings
from app.utils.helpers import utc_now
from app.models.table import DiningSession, Table
from app.models.order import Order, OrderItem
from app.models.billing import Bill, Payment
from app.models.reservation import Reservation
from app.schemas.billing import PaymentCreate
from app.services.settings_service import SettingsService


class BillingService:
    @staticmethod
    async def get_or_calculate_bill(db: AsyncSession, dining_session_id: int) -> Bill:
        # Load dining session with customer and reservation
        sess_query = (
            select(DiningSession)
            .options(
                selectinload(DiningSession.reservation),
                selectinload(DiningSession.customer),
            )
            .where(DiningSession.id == dining_session_id)
        )
        sess_res = await db.execute(sess_query)
        dining_session = sess_res.scalar_one_or_none()
        if not dining_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dining session #{dining_session_id} not found.",
            )

        # Check existing bill
        bill_query = select(Bill).options(selectinload(Bill.payments)).where(Bill.dining_session_id == dining_session_id)
        bill_res = await db.execute(bill_query)
        bill = bill_res.scalar_one_or_none()

        # Calculate line items subtotal across all orders in session
        subtotal_query = (
            select(func.coalesce(func.sum(OrderItem.subtotal), Decimal("0.00")))
            .join(Order, OrderItem.order_id == Order.id)
            .where(Order.dining_session_id == dining_session_id, Order.status != "CANCELLED")
        )
        subtotal_res = await db.execute(subtotal_query)
        calc_subtotal = Decimal(str(subtotal_res.scalar() or "0.00"))

        # Calculate dynamic configurable tax
        tax_rate = Decimal(str(getattr(settings, "DEFAULT_TAX_RATE", "0.05")))
        calc_tax = (calc_subtotal * tax_rate).quantize(Decimal("0.01"))
        gross_total = calc_subtotal + calc_tax

        # Resolve associated reservation for deposit credit
        reservation = dining_session.reservation
        if not reservation and dining_session.customer_id:
            # Fallback lookup: find seated reservation for this customer and table
            res_query = (
                select(Reservation)
                .where(
                    Reservation.customer_id == dining_session.customer_id,
                    Reservation.status.in_(["ARRIVED", "SEATED", "CONFIRMED"]),
                    Reservation.payment_status == "PAID",
                    Reservation.is_deposit_credited == False,
                )
                .order_by(Reservation.created_at.desc())
            )
            res_res = await db.execute(res_query)
            reservation = res_res.scalars().first()
            if reservation:
                dining_session.reservation_id = reservation.id

        # Calculate reservation credit and remainder
        deposit_paid = Decimal("0.00")
        reservation_credit = Decimal("0.00")
        remainder_action = None
        remainder_amount = Decimal("0.00")

        if reservation and reservation.payment_status == "PAID" and not reservation.is_deposit_credited:
            deposit_paid = Decimal(str(reservation.advance_amount or "0.00"))
            remainder_policy = await SettingsService.get_deposit_remainder_policy(db)

            if gross_total >= deposit_paid:
                reservation_credit = deposit_paid
                remainder_amount = Decimal("0.00")
                remainder_action = None
            else:
                # Gross bill < Deposit (e.g. Deposit ₹600, Gross ₹450)
                excess = deposit_paid - gross_total
                if remainder_policy == "REFUND_REMAINDER":
                    reservation_credit = gross_total
                    remainder_amount = excess
                    remainder_action = "REFUND_REMAINDER"
                elif remainder_policy == "FORFEIT_REMAINDER":
                    reservation_credit = deposit_paid
                    remainder_amount = Decimal("0.00")
                    remainder_action = "FORFEIT_REMAINDER"
                else:  # CUSTOMER_CREDIT
                    reservation_credit = gross_total
                    remainder_amount = excess
                    remainder_action = "CUSTOMER_CREDIT"

        discount = bill.discount_amount if bill else Decimal("0.00")
        net_due = max(gross_total - reservation_credit - discount, Decimal("0.00"))

        if not bill:
            bill = Bill(
                dining_session_id=dining_session_id,
                subtotal=calc_subtotal,
                tax_amount=calc_tax,
                discount_amount=Decimal("0.00"),
                reservation_deposit_paid=deposit_paid,
                reservation_credit=reservation_credit,
                remainder_action=remainder_action,
                remainder_amount=remainder_amount,
                total_amount=net_due,
                is_paid=False,
            )
            db.add(bill)
            await db.commit()
            await db.refresh(bill)
        else:
            bill.subtotal = calc_subtotal
            bill.tax_amount = calc_tax
            bill.reservation_deposit_paid = deposit_paid
            bill.reservation_credit = reservation_credit
            bill.remainder_action = remainder_action
            bill.remainder_amount = remainder_amount
            bill.total_amount = net_due
            await db.commit()
            await db.refresh(bill)

        return bill

    @staticmethod
    async def process_checkout(db: AsyncSession, bill_id: int, payment_data: PaymentCreate) -> Payment:
        # Check idempotency key first
        if payment_data.idempotency_key:
            idem_query = select(Payment).where(Payment.idempotency_key == payment_data.idempotency_key)
            idem_res = await db.execute(idem_query)
            existing_payment = idem_res.scalar_one_or_none()
            if existing_payment:
                return existing_payment

        # Lock bill for update
        bill_query = select(Bill).where(Bill.id == bill_id).with_for_update()
        bill_res = await db.execute(bill_query)
        bill = bill_res.scalar_one_or_none()

        if not bill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bill #{bill_id} not found.",
            )

        if bill.is_paid:
            # Return existing payment if already paid
            pay_query = select(Payment).where(Payment.bill_id == bill.id)
            pay_res = await db.execute(pay_query)
            already_paid = pay_res.scalar_one_or_none()
            if already_paid:
                return already_paid

        # Validate payment amount against remaining bill total
        if Decimal(str(payment_data.amount_paid)) < Decimal(str(bill.total_amount)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INSUFFICIENT_PAYMENT: Payment amount (₹{payment_data.amount_paid}) is less than total bill amount (₹{bill.total_amount}).",
            )

        # Create payment record
        payment = Payment(
            bill_id=bill.id,
            payment_method=payment_data.payment_method,
            amount_paid=payment_data.amount_paid,
            transaction_reference=payment_data.transaction_reference,
            idempotency_key=payment_data.idempotency_key,
        )
        db.add(payment)

        # Mark bill paid
        bill.is_paid = True

        # Close dining session and reset table availability
        session_query = select(DiningSession).where(DiningSession.id == bill.dining_session_id).with_for_update()
        session_res = await db.execute(session_query)
        dining_session = session_res.scalar_one_or_none()

        if dining_session:
            dining_session.status = "CLOSED"
            dining_session.closed_at = utc_now()

            # Mark associated reservation's deposit as permanently credited
            if dining_session.reservation_id:
                res_stmt = (
                    select(Reservation)
                    .where(Reservation.id == dining_session.reservation_id)
                    .with_for_update()
                )
                res_res = await db.execute(res_stmt)
                reservation = res_res.scalar_one_or_none()
                if reservation:
                    reservation.is_deposit_credited = True
                    reservation.credited_bill_id = bill.id
                    reservation.status = "COMPLETED"

            table_query = select(Table).where(Table.id == dining_session.table_id)
            table_res = await db.execute(table_query)
            table = table_res.scalar_one_or_none()
            if table:
                table.status = "Available"

        try:
            await db.commit()
            await db.refresh(payment)
            return payment
        except IntegrityError:
            await db.rollback()
            if payment_data.idempotency_key:
                idem_query = select(Payment).where(Payment.idempotency_key == payment_data.idempotency_key)
                idem_res = await db.execute(idem_query)
                existing_payment = idem_res.scalar_one_or_none()
                if existing_payment:
                    return existing_payment
            raise

