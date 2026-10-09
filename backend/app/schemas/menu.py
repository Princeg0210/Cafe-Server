from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MenuCategoryCreate(BaseModel):
    name: str = Field(..., example="Wood-Fired Pizzas")
    display_order: int = Field(0, example=1)
    is_active: bool = True


class MenuCategoryResponse(MenuCategoryCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class MenuItemCreate(BaseModel):
    category_id: int
    name: str = Field(..., example="Truffle Mushroom Pizza")
    description: Optional[str] = Field(None, example="Black truffle paste, wild mushrooms, fresh mozzarella")
    price: Decimal = Field(..., example="550.00")
    tax_rate: Decimal = Field(Decimal("5.00"), example="5.00")
    is_available: bool = True
    is_active: bool = True


class MenuItemUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    is_available: Optional[bool] = None
    is_active: Optional[bool] = None


class MenuItemResponse(MenuItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    is_sold_out: bool = False
    allocated_count: Optional[int] = None
    max_production_limit: Optional[int] = None

