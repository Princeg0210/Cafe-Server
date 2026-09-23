from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    menu_item_id: int = Field(..., example=1)
    quantity: int = Field(..., ge=1, example=2)
    special_instructions: Optional[str] = Field(None, example="Extra crispy crust, no onions")


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    menu_item_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    special_instructions: Optional[str] = None


class OrderCreate(BaseModel):
    qr_token: str = Field(..., example="qr-tbl-1-sec-token-123456")
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dining_session_id: int
    order_number: str
    status: str
    created_at: datetime
    items: List[OrderItemResponse] = []
