from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.reservation import sanitize_customer_name, sanitize_customer_phone


class TableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    branch_id: int
    table_number: str
    capacity: int
    status: str
    floor_number: Optional[int] = 1
    floor_name: Optional[str] = "Ground floor"
    floor_table_num: Optional[int] = 1
    qr_token: Optional[str] = None
    floor: Optional[int] = None  # set only for tables added from admin (those can be removed if unused)


class TableCreate(BaseModel):
    """Add a table from admin: it gets the next number on its floor and its own QR code."""
    floor_number: int = Field(..., ge=1, le=5)
    capacity: int = Field(4, ge=1, le=20)


class TableQRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_id: int
    qr_token: str
    is_active: bool


class QRValidateRequest(BaseModel):
    qr_token: str


# ponytail: minimal walk-in request with name & phone
class QRWalkInRequest(BaseModel):
    qr_token: str
    customer_name: str
    phone_number: str
    guest_count: Optional[int] = 2

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return sanitize_customer_name(v)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return sanitize_customer_phone(v)


class QRWalkInResponse(BaseModel):
    success: bool
    reservation_id: int
    booking_id: str
    customer_name: str
    table_number: str
    session_id: int
    session_token: str
    status: str


class ReservationNotice(BaseModel):
    is_reserved: bool = True
    reservation_id: int
    customer_name: str
    guest_count: int
    time_slot: str
    reservation_date: str
    status: str
    floor_number: Optional[int] = 1
    table_name: Optional[str] = "Table 1"
    minutes_until_reservation: Optional[int] = None
    can_quick_dine: bool = False
    quick_dine_minutes: Optional[int] = None
    allow_self_checkin: bool = True


class QRValidateResponse(BaseModel):
    is_valid: bool
    table_id: int
    table_number: str
    branch_id: int
    session_id: Optional[int] = None
    session_token: str
    session_status: str
    is_reserved: bool = False
    reservation: Optional[ReservationNotice] = None
    is_generalized: bool = False


class GeneralizedQRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    qr_token: str
    is_active: bool
    created_at: datetime
    notes: Optional[str] = None


class GeneralizedQRListResponse(BaseModel):
    active_qr: Optional[GeneralizedQRResponse] = None
    all_qrs: List[GeneralizedQRResponse] = []


class ToggleQRStatusRequest(BaseModel):
    qr_token: Optional[str] = None
    id: Optional[int] = None
    is_active: bool


class ClaimReservationRequest(BaseModel):
    qr_token: str
    session_token: str
    reservation_code: str


class ClaimReservationResponse(BaseModel):
    success: bool
    reservation_id: int
    customer_name: str
    table_id: Optional[int] = None
    table_number: str
    status: str
    guest_count: int


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
    allergy_info: Optional[str] = None
