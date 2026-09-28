from decimal import Decimal
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.settings import SystemSettings
from app.core.config import settings


class SettingsService:
    @staticmethod
    async def get_setting(db: AsyncSession, key: str, default: Optional[str] = None) -> str:
        stmt = select(SystemSettings).where(SystemSettings.key == key)
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()
        if setting:
            return setting.value
        return default if default is not None else ""

    @staticmethod
    async def set_setting(db: AsyncSession, key: str, value: str, description: Optional[str] = None) -> SystemSettings:
        stmt = select(SystemSettings).where(SystemSettings.key == key)
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()
        if setting:
            setting.value = value
            if description:
                setting.description = description
        else:
            setting = SystemSettings(key=key, value=value, description=description)
            db.add(setting)
        await db.commit()
        await db.refresh(setting)
        return setting

    @staticmethod
    async def get_deposit_per_guest(db: AsyncSession) -> Decimal:
        val = await SettingsService.get_setting(db, "RESERVATION_DEPOSIT_PER_PERSON", settings.DEFAULT_DEPOSIT_PER_GUEST)
        try:
            return Decimal(val)
        except Exception:
            return Decimal("200.00")

    @staticmethod
    async def get_deposit_remainder_policy(db: AsyncSession) -> str:
        """
        Options:
        - REFUND_REMAINDER: Refund the excess deposit to customer
        - CUSTOMER_CREDIT: Store excess as store credit for customer's next visit
        - FORFEIT_REMAINDER: Retain remainder as cover / minimum reservation fee
        """
        return await SettingsService.get_setting(
            db, "RESERVATION_DEPOSIT_REMAINDER_POLICY", settings.DEFAULT_DEPOSIT_REMAINDER_POLICY
        )

    @staticmethod
    async def get_cancellation_policy(db: AsyncSession) -> dict:
        policy = await SettingsService.get_setting(db, "CANCELLATION_REFUND_POLICY", settings.DEFAULT_CANCELLATION_POLICY)
        cutoff_hours_str = await SettingsService.get_setting(db, "CANCELLATION_CUTOFF_HOURS", str(settings.DEFAULT_CANCELLATION_CUTOFF_HOURS))
        refund_pct_str = await SettingsService.get_setting(db, "CANCELLATION_REFUND_PERCENTAGE", str(settings.DEFAULT_CANCELLATION_REFUND_PERCENTAGE))
        no_show_policy = await SettingsService.get_setting(db, "NO_SHOW_POLICY", settings.DEFAULT_NO_SHOW_POLICY)

        try:
            cutoff_hours = int(cutoff_hours_str)
        except Exception:
            cutoff_hours = 2

        try:
            refund_pct = Decimal(refund_pct_str)
        except Exception:
            refund_pct = Decimal("100")

        return {
            "policy": policy,
            "cutoff_hours": cutoff_hours,
            "refund_percentage": refund_pct,
            "no_show_policy": no_show_policy,
        }
