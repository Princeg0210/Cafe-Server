from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional
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


class SessionItemDetail(BaseModel):
    name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    special_instructions: Optional[str] = None


class SessionDiscountRequest(BaseModel):
    # None clears the discount
    discount_type: Optional[Literal["PERCENT", "FLAT"]] = None
    discount_value: Decimal = Decimal("0.00")
    reason: Optional[str] = None


class TableSessionDetail(BaseModel):
    session_id: int
    session_seq: int
    session_token: str
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    total_amount: Decimal
    items_count: int
    is_active: bool
    is_settled: bool
    items: List[SessionItemDetail] = []
    reservation_id: Optional[int] = None
    subtotal: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    gross_amount: Decimal = Decimal("0.00")
    reservation_deposit_paid: Decimal = Decimal("0.00")
    reservation_credit: Decimal = Decimal("0.00")
    net_amount_due: Decimal = Decimal("0.00")
    remainder_action: Optional[str] = None
    remainder_amount: Decimal = Decimal("0.00")
    discount_type: Optional[str] = None
    discount_value: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    discount_reason: Optional[str] = None


class TableOverviewResponse(BaseModel):
    table_id: int
    table_number: str
    capacity: int
    status: str
    active_session_count: int
    total_sessions_today: int
    sessions: List[TableSessionDetail] = []
    floor_number: Optional[int] = 1
    floor_name: Optional[str] = "Ground floor"
    floor_table_num: Optional[int] = 1


class MergeTablesRequest(BaseModel):
    source_table_id: int
    target_table_id: int

