from fastapi import APIRouter, Depends, Header
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_permission, verify_dining_session_access, oauth2_scheme
from app.models.user import User
from app.models.table import DiningSession
from app.schemas.billing import BillResponse, PaymentCreate, PaymentResponse
from app.services.billing_service import BillingService

router = APIRouter(prefix="/bills", tags=["POS Billing & Payments"])


@router.get("/{dining_session_id}", response_model=BillResponse)
async def get_running_bill(
    dining_session_id: int,
    db: AsyncSession = Depends(get_db),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    token: Optional[str] = Depends(oauth2_scheme),
):
    await verify_dining_session_access(
        id=dining_session_id, db=db, x_session_token=x_session_token, token=token
    )
    return await BillingService.get_or_calculate_bill(db, dining_session_id)


@router.post("/{id}/checkout", response_model=PaymentResponse, status_code=201)
async def process_checkout(
    id: int,
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("pos:access")),
):
    return await BillingService.process_checkout(db, id, payment_data)
