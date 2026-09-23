from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ItemCapacityRuleCreate(BaseModel):
    menu_item_id: int = Field(..., example=1)
    max_production_limit: int = Field(..., ge=1, example=50)
    reset_period: str = Field("DAILY", example="DAILY")
    is_active: bool = True


class ItemCapacityRuleUpdate(BaseModel):
    max_production_limit: Optional[int] = Field(None, ge=1)
    allocated_count: Optional[int] = Field(None, ge=0)
    reset_period: Optional[str] = None
    is_active: Optional[bool] = None


class ItemCapacityRuleResponse(ItemCapacityRuleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    allocated_count: int
    updated_at: datetime
