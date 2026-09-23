from datetime import datetime
from decimal import Decimal
from typing import List, Optional
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
