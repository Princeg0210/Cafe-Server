from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# Largest quantity of one dish on a single order line or bill edit (blocks prank/typo orders)
MAX_ITEM_QUANTITY = 50


class OrderItemCreate(BaseModel):
    menu_item_id: Optional[int] = Field(None, example=1)
    name: Optional[str] = Field(None, example="HIMALAYAN ROSEHIP & MINT TISANE")
    quantity: int = Field(..., ge=1, le=MAX_ITEM_QUANTITY, example=2)
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
    session_token: Optional[str] = Field(None, example="sess_tok_123456")
    allergy_info: Optional[str] = Field(None, max_length=500, example="Nut allergy, no onions")
    items: List[OrderItemCreate] = Field(..., min_length=1)



class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dining_session_id: int
    order_number: str
    status: str
    allergy_info: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []
