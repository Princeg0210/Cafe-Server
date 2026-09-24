from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class KOTItemResponse(BaseModel):
    name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    special_instructions: Optional[str] = None


class KOTResponse(BaseModel):
    id: int
    kot_number: str
    sequence_number: int
    business_date: date
    table_number: str
    table_id: int
    dining_session_id: int
    order_id: int
    order_number: str
    total_amount: Decimal
    items_count: int
    status: str
    printed_status: str
    created_at: datetime
    items: List[KOTItemResponse] = []
    print_job_id: Optional[int] = None

    class Config:
        from_attributes = True


class ItemSummaryResponse(BaseModel):
    name: str
    quantity: int


class CategorySummaryResponse(BaseModel):
    category: str
    quantity: int


class DayStats(BaseModel):
    kots: int
    items: int
    pizzas: int = 0
    pastas: int = 0
    beverages: int = 0


class POSSummaryResponse(BaseModel):
    business_date: str
    total_kots: int
    tables_served: int
    total_items: int
    avg_items_per_kot: float
    avg_kot_value: float
    kots_per_hour: float
    peak_hour: str
    item_summary: List[ItemSummaryResponse] = []
    category_summary: List[CategorySummaryResponse] = []
    comparison: dict = {}
