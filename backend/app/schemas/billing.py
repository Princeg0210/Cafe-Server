from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    payment_method: str = Field(..., example="UPI")  # CASH, CARD, UPI
    amount_paid: Decimal = Field(..., example="1155.00")
    transaction_reference: Optional[str] = Field(None, example="UPI-REF-99887766")
    idempotency_key: str = Field(..., example="pos-chk-session-12-attempt-1")


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bill_id: int
    payment_method: str
    amount_paid: Decimal
    transaction_reference: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime


class BillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dining_session_id: int
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    is_paid: bool
    created_at: datetime
    payments: List[PaymentResponse] = []
