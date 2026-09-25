import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.bank_transaction import VerifiedBankCredit
from app.models.reservation import Reservation
from app.core.config import settings
from app.core.logging import logger


class PaymentVerificationService:
    """
    Independent Payment Verification Engine.
    Enforces that customer-entered transaction references or UTRs NEVER self-confirm reservations.
    A reservation can ONLY be confirmed when a matching, settled credit from an authentic
    bank/payment gateway webhook or staff POS reconciliation exists in the database.
    """

    @staticmethod
    async def record_verified_bank_credit(
        db: AsyncSession,
        utr: str,
        amount: float,
        merchant_vpa: str = settings.MERCHANT_UPI_ID,
        provider_source: str = "BANK_WEBHOOK",
        payer_vpa: Optional[str] = None,
        tx_status: str = "SETTLED",
    ) -> VerifiedBankCredit:
        """
        Records an authentic bank credit received from a bank acquirer, payment gateway webhook,
        or staff bank statement reconciliation.
        """
        clean_utr = utr.strip().replace(" ", "").replace("-", "")
        stmt = (
            select(VerifiedBankCredit)
            .where(func.lower(VerifiedBankCredit.utr) == clean_utr.lower())
            .with_for_update()
        )
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            return existing

        credit = VerifiedBankCredit(
            utr=clean_utr,
            amount=Decimal(str(amount)),
            merchant_vpa=merchant_vpa,
            payer_vpa=payer_vpa,
            status=tx_status,
            provider_source=provider_source,
            is_claimed=False,
        )
        db.add(credit)
        await db.commit()
        await db.refresh(credit)
        logger.info(f"Verified bank credit recorded: UTR={clean_utr} Amount={amount} Source={provider_source}")
        return credit

    @staticmethod
    async def verify_and_claim_credit(
        db: AsyncSession,
        reservation: Reservation,
        utr: str,
    ) -> VerifiedBankCredit:
        """
        Verifies whether an authentic bank credit exists for this UTR with sufficient funds.
        If found and valid, atomically claims the credit for the reservation.
        If not found or invalid, raises appropriate HTTP exception.
        """
        clean_utr = utr.strip().replace(" ", "").replace("-", "")

        # 1. Query verified bank credits with atomic row-level lock
        stmt = (
            select(VerifiedBankCredit)
            .where(func.lower(VerifiedBankCredit.utr) == clean_utr.lower())
            .with_for_update()
        )
        res = await db.execute(stmt)
        credit = res.scalars().first()

        # 2. Strict rejection: No genuine bank credit exists for this UTR
        if not credit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"PAYMENT_NOT_VERIFIED: No settled bank credit found for UTR '{clean_utr}'. "
                    f"Customer-entered transaction references cannot confirm reservations without independent bank verification."
                ),
            )

        # 3. Prevent reuse / replay of already claimed bank credits
        if credit.is_claimed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"UTR_ALREADY_USED: This bank credit for UTR '{clean_utr}' has already been claimed "
                    f"and exhausted for Reservation #{credit.claimed_reservation_id}."
                ),
            )

        # 4. Check credit status
        if credit.status != "SETTLED":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"PAYMENT_FAILED: Bank payment status is '{credit.status}'.",
            )

        # 5. Check credit amount
        required_advance = Decimal(str(reservation.advance_amount or 0.0))
        if credit.amount < required_advance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"PAYMENT_UNDERPAID: Bank credit of ₹{credit.amount} is less than required deposit of ₹{required_advance}."
                ),
            )

        # 6. Atomically claim the credit
        credit.is_claimed = True
        credit.claimed_reservation_id = reservation.id
        await db.flush()
        return credit
