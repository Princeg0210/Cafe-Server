from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    branch_id: int
    table_number: str
    capacity: int
    status: str


class TableQRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_id: int
    qr_token: str
    is_active: bool


class QRValidateRequest(BaseModel):
    qr_token: str


class QRValidateResponse(BaseModel):
    is_valid: bool
    table_id: int
    table_number: str
    branch_id: int
    session_token: str
    session_status: str


class DiningSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_id: int
    customer_id: Optional[int] = None
    session_token: str
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None


class SessionBillItemResponse(BaseModel):
    name: str
    quantity: int
    price: float
    total: float


class SessionBillResponse(BaseModel):
    session_id: int
    table_number: str
    status: str
    items: List[SessionBillItemResponse]
    subtotal: float
    tax_rate: float
    tax_amount: float
    grand_total: float
