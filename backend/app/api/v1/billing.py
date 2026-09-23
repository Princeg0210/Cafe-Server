from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.billing import BillResponse, PaymentCreate, PaymentResponse
from app.services.billing_service import BillingService

router = APIRouter(prefix="/bills", tags=["POS Billing & Payments"])


@router.get("/{dining_session_id}", response_model=BillResponse)
async def get_running_bill(dining_session_id: int, db: AsyncSession = Depends(get_db)):
    return await BillingService.get_or_calculate_bill(db, dining_session_id)


@router.post("/{id}/checkout", response_model=PaymentResponse, status_code=201)
async def process_checkout(
    id: int,
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await BillingService.process_checkout(db, id, payment_data)
