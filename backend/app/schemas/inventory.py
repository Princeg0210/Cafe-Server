from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class InventoryItemCreate(BaseModel):
    sku: str = Field(..., example="ING-FLOUR-01")
    name: str = Field(..., example="00 Pizza Flour")
    unit_of_measure: str = Field(..., example="kg")
    current_stock: Decimal = Field(Decimal("50.0000"), example="50.0000")
    reorder_threshold: Decimal = Field(Decimal("10.0000"), example="10.0000")


class InventoryItemResponse(InventoryItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class InventoryTransactionCreate(BaseModel):
    inventory_item_id: int
    transaction_type: str = Field(..., example="PURCHASE")  # PURCHASE, SALE_CONSUMPTION, ADJUSTMENT, WASTE, RETURN, TRANSFER, INITIAL_STOCK
    quantity_change: Decimal = Field(..., example="25.5000")
    reference_id: Optional[str] = Field(None, example="PO-1001")


class InventoryTransactionResponse(InventoryTransactionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class RecipeItemCreate(BaseModel):
    inventory_item_id: int
    quantity_required: Decimal = Field(..., example="0.2500")


class RecipeItemResponse(RecipeItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class RecipeCreate(BaseModel):
    menu_item_id: int
    name: str = Field(..., example="Truffle Pizza Recipe")
    instructions: Optional[str] = Field(None, example="Bake at 450C for 90 seconds")
    items: List[RecipeItemCreate] = Field(..., min_length=1)


class RecipeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    menu_item_id: int
    name: str
    instructions: Optional[str] = None
    items: List[RecipeItemResponse] = []


# ---- Supplier bill scanning ----

class BillScanLine(BaseModel):
    description: str
    quantity: Optional[Decimal] = None
    unit: str = ""
    unit_price: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    suggested_material_id: Optional[int] = None
    match_score: float = 0.0
    stock_quantity: Optional[Decimal] = None  # quantity in the suggested material's unit, if convertible


class BillScanDraft(BaseModel):
    supplier_name: Optional[str] = None
    bill_number: Optional[str] = None
    bill_date: Optional[str] = None
    grand_total: Optional[Decimal] = None
    lines: List[BillScanLine] = []


class BillConfirmLine(BaseModel):
    action: Literal["MATCH", "NEW", "SKIP"]
    description: str = ""
    inventory_item_id: Optional[int] = None  # MATCH
    quantity: Decimal = Decimal("0")  # in the material's unit
    unit_cost: Decimal = Decimal("0")  # INR per material unit, before tax
    new_name: Optional[str] = None  # NEW
    new_sku: Optional[str] = None
    new_unit: Optional[str] = None
    new_reorder_threshold: Decimal = Decimal("0")


class BillConfirmRequest(BaseModel):
    supplier_name: str = Field(..., min_length=1, max_length=100)
    bill_number: str = Field(..., min_length=1, max_length=100)
    bill_date: Optional[date] = None
    lines: List[BillConfirmLine] = Field(..., min_length=1)


class BillConfirmResponse(BaseModel):
    purchase_order_id: int
    supplier_id: int
    items_received: int
    materials_created: int
    total_cost: Decimal
