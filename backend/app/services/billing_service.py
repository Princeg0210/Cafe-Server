import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.table import DiningSession, Table
from app.models.order import Order, OrderItem
from app.models.billing import Bill, Payment
from app.schemas.billing import PaymentCreate


from app.utils.helpers import utc_now


class BillingService:
    @staticmethod
    async def get_or_calculate_bill(db: AsyncSession, dining_session_id: int) -> Bill:
        # Check existing bill
        bill_query = select(Bill).where(Bill.dining_session_id == dining_session_id)
        bill_res = await db.execute(bill_query)
        bill = bill_res.scalar_one_or_none()

        # Calculate line items subtotal across all orders in session
        subtotal_query = (
            select(func.coalesce(func.sum(OrderItem.subtotal), Decimal("0.00")))
            .join(Order, OrderItem.order_id == Order.id)
            .where(Order.dining_session_id == dining_session_id)
        )
        subtotal_res = await db.execute(subtotal_query)
        calc_subtotal = Decimal(str(subtotal_res.scalar() or "0.00"))

        # Calculate 5% tax
        calc_tax = (calc_subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        calc_total = calc_subtotal + calc_tax

        if not bill:
            bill = Bill(
                dining_session_id=dining_session_id,
                subtotal=calc_subtotal,
                tax_amount=calc_tax,
                discount_amount=Decimal("0.00"),
                total_amount=calc_total,
                is_paid=False,
            )
            db.add(bill)
            await db.commit()
            await db.refresh(bill)
        else:
            bill.subtotal = calc_subtotal
            bill.tax_amount = calc_tax
            bill.total_amount = calc_total - bill.discount_amount
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

        # Validate payment amount against bill total
        if Decimal(str(payment_data.amount_paid)) < Decimal(str(bill.total_amount)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"INSUFFICIENT_PAYMENT: Payment amount ({payment_data.amount_paid}) is less than total bill amount ({bill.total_amount}).",
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
        session_query = select(DiningSession).where(DiningSession.id == bill.dining_session_id)
        session_res = await db.execute(session_query)
        dining_session = session_res.scalar_one_or_none()

        if dining_session:
            dining_session.status = "CLOSED"
            dining_session.closed_at = utc_now()

            table_query = select(Table).where(Table.id == dining_session.table_id)
            table_res = await db.execute(table_query)
            table = table_res.scalar_one_or_none()
            if table:
                table.status = "Available"

        from sqlalchemy.exc import IntegrityError
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
