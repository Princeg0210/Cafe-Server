from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class KitchenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    branch_id: int
    name: str


class KitchenStatusUpdate(BaseModel):
    status: str  # SENT, PREPARING, READY, SERVED


class PrintJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kitchen_order_id: int
    printer_id: Optional[int] = None
    ticket_content: str
    status: str
    retry_count: int
    created_at: datetime


class KitchenOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    kitchen_id: int
    status: str
    created_at: datetime
    kitchen: Optional[KitchenResponse] = None
    print_jobs: List[PrintJobResponse] = []
