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


class ReservationUpdate(BaseModel):
    guest_count: Optional[int] = Field(None, ge=1, le=20)
    reservation_date: Optional[date] = None
    time_slot: Optional[str] = None
    status: Optional[str] = None


class ReservationStatusUpdate(BaseModel):
    status: str = Field(..., example="ARRIVED")


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    branch_id: int
    customer_id: int
    guest_count: int
    reservation_date: date
    time_slot: str
    status: str
    celery_task_id: Optional[str] = None
    created_at: datetime
    customer: Optional[CustomerResponse] = None


class ReservationCapacityRuleCreate(BaseModel):
    branch_id: int
    time_slot: str
    max_guest_capacity: int = Field(..., ge=1)
    is_active: bool = True


class ReservationCapacityRuleResponse(ReservationCapacityRuleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
