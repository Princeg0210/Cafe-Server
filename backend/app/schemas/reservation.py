from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ReservationCreate(BaseModel):
    branch_id: int = Field(..., example=1)
    customer_name: str = Field(..., example="Rajesh Sharma")
    customer_phone: str = Field(..., example="+919876543210")
    customer_email: Optional[str] = Field(None, example="rajesh@example.com")
    guest_count: int = Field(..., ge=1, le=20, example=4)
    reservation_date: date = Field(..., example="2026-09-25")
    time_slot: str = Field(..., example="19:00-20:00")
    table_id: Optional[int] = Field(None, example=1)
    floor_number: Optional[int] = Field(None, example=1)
    table_name: Optional[str] = Field(None, example="Table 1")
    payment_status: Optional[str] = Field("PAID", example="PAID")
    advance_amount: Optional[float] = Field(0.0, example=400.0)
    payment_reference: Optional[str] = Field(None, example="TXN-UPI-987654321")
    payment_method: Optional[str] = Field(None, example="UPI")


class ReservationUpdate(BaseModel):
    guest_count: Optional[int] = Field(None, ge=1, le=20)
    reservation_date: Optional[date] = None
    time_slot: Optional[str] = None
    table_id: Optional[int] = None
    floor_number: Optional[int] = None
    table_name: Optional[str] = None
    status: Optional[str] = None


class ReservationStatusUpdate(BaseModel):
    status: str = Field(..., example="ARRIVED")


class ReservationCheckInRequest(BaseModel):
    session_token: Optional[str] = None
    table_id: Optional[int] = None


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    branch_id: int
    customer_id: int
    guest_count: int
    reservation_date: date
    time_slot: str
    table_id: Optional[int] = None
    floor_number: Optional[int] = None
    table_name: Optional[str] = None
    status: str
    payment_status: Optional[str] = "PAID"
    advance_amount: Optional[float] = 0.0
    payment_reference: Optional[str] = None
    payment_method: Optional[str] = None
    hold_expires_at: Optional[datetime] = None
    upi_id: Optional[str] = None
    upi_utr: Optional[str] = None
    celery_task_id: Optional[str] = None
    created_at: datetime
    customer: Optional[CustomerResponse] = None


class ReservationHoldRequest(BaseModel):
    branch_id: int = Field(1, example=1)
    customer_name: str = Field(..., example="Aarav Sharma")
    customer_phone: str = Field(..., example="+919876543210")
    customer_email: Optional[str] = None
    guest_count: int = Field(2, ge=1, le=20)
    reservation_date: date = Field(..., example="2026-09-30")
    time_slot: str = Field(..., example="19:30")
    floor_number: int = Field(1, example=1)
    table_name: str = Field("Table 1", example="Table 1")
    table_id: Optional[int] = None


class ReservationHoldResponse(BaseModel):
    reservation_id: int
    hold_expires_at: datetime
    seconds_remaining: int
    advance_amount: float
    upi_id: str
    upi_uri: str
    qr_code_content: str
    status: str
    floor_number: int
    table_name: str
    reservation_date: date
    time_slot: str


class ReservationVerifyUpiRequest(BaseModel):
    upi_utr: str = Field(..., min_length=4, max_length=50, example="426819283741")
    customer_upi_vpa: Optional[str] = Field(None, example="customer@okaxis")


class ReservationCapacityRuleCreate(BaseModel):
    branch_id: int
    time_slot: str
    max_guest_capacity: int = Field(..., ge=1)
    is_active: bool = True


class ReservationCapacityRuleResponse(ReservationCapacityRuleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
