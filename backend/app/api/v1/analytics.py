from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.models.order import Order
from app.models.billing import Bill, Payment
from app.models.reservation import Reservation
from pydantic import BaseModel

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])


class AnalyticsSummary(BaseModel):
    total_orders: int
    total_revenue: Decimal
    active_reservations: int
    paid_bills_count: int


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    # Total orders
    orders_res = await db.execute(select(func.count(Order.id)))
    total_orders = orders_res.scalar() or 0

    # Total revenue from paid payments
    revenue_res = await db.execute(select(func.coalesce(func.sum(Payment.amount_paid), Decimal("0.00"))))
    total_revenue = Decimal(str(revenue_res.scalar() or "0.00"))

    # Active reservations
    res_res = await db.execute(select(func.count(Reservation.id)).where(Reservation.status == "CONFIRMED"))
    active_reservations = res_res.scalar() or 0

    # Paid bills count
    bills_res = await db.execute(select(func.count(Bill.id)).where(Bill.is_paid == True))
    paid_bills_count = bills_res.scalar() or 0

    return AnalyticsSummary(
        total_orders=total_orders,
        total_revenue=total_revenue,
        active_reservations=active_reservations,
        paid_bills_count=paid_bills_count,
    )
