from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_permission
from app.models.inventory import InventoryItem
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryTransactionCreate,
    InventoryTransactionResponse,
)
from app.services.inventory_service import InventoryService

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory & Raw Stock"],
    dependencies=[Depends(require_permission("pos:access"))],
)


@router.get("", response_model=List[InventoryItemResponse])
async def list_inventory(db: AsyncSession = Depends(get_db)):
    query = select(InventoryItem).order_by(InventoryItem.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/low-stock", response_model=List[InventoryItemResponse])
async def list_low_stock(db: AsyncSession = Depends(get_db)):
    query = select(InventoryItem).where(
        InventoryItem.current_stock <= InventoryItem.reorder_threshold
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/items", response_model=InventoryItemResponse, status_code=201)
async def create_inventory_item(data: InventoryItemCreate, db: AsyncSession = Depends(get_db)):
    item = InventoryItem(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/transactions", response_model=InventoryTransactionResponse, status_code=201)
async def record_transaction(data: InventoryTransactionCreate, db: AsyncSession = Depends(get_db)):
    return await InventoryService.record_transaction(
        db,
        inventory_item_id=data.inventory_item_id,
        transaction_type=data.transaction_type,
        quantity_change=data.quantity_change,
        reference_id=data.reference_id,
    )
