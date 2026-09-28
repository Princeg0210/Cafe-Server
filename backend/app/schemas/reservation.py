from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Any, Union
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
    advance_amount: Optional[Decimal] = Field(None, example="400.00")
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


class ReservationAssignTableRequest(BaseModel):
    table_id: int = Field(..., example=1)
    table_name: Optional[str] = Field(None, example="Table 1")
    floor_number: Optional[int] = Field(None, example=1)


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
    is_deposit_credited: bool = False
    credited_bill_id: Optional[int] = None
    cancellation_refund_amount: Optional[float] = 0.0
    cancellation_refund_status: Optional[str] = None
    celery_task_id: Optional[str] = None
    created_at: datetime
    customer: Optional[CustomerResponse] = None


class ReservationHoldRequest(BaseModel):
    branch_id: int = Field(1, example=1)
    customer_name: str = Field(..., example="Aarav Sharma")
    customer_phone: str = Field(..., example="+919876543210")
    customer_email: Optional[str] = None
    guest_count: int = Field(..., ge=1, le=20, example=3)
    reservation_date: date = Field(..., example="2026-09-30")
    time_slot: str = Field(..., example="19:30")
    floor_number: Optional[int] = Field(None, example=1)
    table_name: Optional[str] = Field(None, example="Table 1")
    table_id: Optional[int] = None


class ReservationHoldResponse(BaseModel):
    reservation_id: int
    hold_expires_at: datetime
    seconds_remaining: int
    advance_amount: float
    guest_count: int
    deposit_per_guest: float
    upi_id: str
    upi_uri: str
    qr_code_content: str
    status: str
    floor_number: Optional[int] = None
    table_name: Optional[str] = None
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


class BankWebhookPayload(BaseModel):
    utr: str = Field(..., min_length=4, max_length=64, example="426819283741")
    amount: Decimal = Field(..., gt=0, example=400.0)
    merchant_vpa: str = Field("9460555743-2@ybl")
    payer_vpa: Optional[str] = None
    tx_status: str = Field("SETTLED", example="SETTLED")
    provider_source: str = Field("BANK_WEBHOOK", example="BANK_WEBHOOK")
    signature: Optional[str] = None


class PaymentEventPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    event_id: Optional[str] = Field(None, example="evt-sms-887766")
    utr: Optional[str] = Field(None, example="235745067878")
    amount: Optional[Any] = Field(None, example=600.00)
    merchant_vpa: Optional[str] = Field("9460555743-2@ybl")
    payer_vpa: Optional[str] = None
    event_timestamp: Optional[datetime] = None
    raw_sms: Optional[str] = Field(None, example="Rs. 600 credited to account ... UPI Ref 235745067878")
    msg: Optional[str] = None
    text: Optional[str] = None
    content: Optional[str] = None


AndroidPaymentEventPayload = PaymentEventPayload
DevicePaymentEventPayload = PaymentEventPayload




class PolicySettingsUpdate(BaseModel):
    deposit_per_person: Optional[Decimal] = Field(None, ge=100)
    remainder_policy: Optional[str] = Field(None, example="CUSTOMER_CREDIT")  # REFUND_REMAINDER, CUSTOMER_CREDIT, FORFEIT_REMAINDER
    cancellation_policy: Optional[str] = Field(None, example="REFUND_BEFORE_CUTOFF")
    cancellation_cutoff_hours: Optional[int] = Field(None, ge=0)
    cancellation_refund_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    no_show_policy: Optional[str] = Field(None, example="FORFEIT")


