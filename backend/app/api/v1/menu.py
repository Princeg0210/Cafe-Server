from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.models.menu import MenuCategory, MenuItem
from app.models.capacity import ItemCapacityRule
from app.schemas.menu import MenuCategoryCreate, MenuCategoryResponse, MenuItemCreate, MenuItemResponse

router = APIRouter(prefix="/menu", tags=["Menu & Production Capacity"])


@router.get("/categories", response_model=List[MenuCategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    query = select(MenuCategory).where(MenuCategory.is_active == True).order_by(MenuCategory.display_order)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/categories", response_model=MenuCategoryResponse, status_code=201)
async def create_category(data: MenuCategoryCreate, db: AsyncSession = Depends(get_db)):
    category = MenuCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/items", response_model=List[MenuItemResponse])
async def list_menu_items(db: AsyncSession = Depends(get_db)):
    query = (
        select(MenuItem, ItemCapacityRule)
        .outerjoin(ItemCapacityRule, MenuItem.id == ItemCapacityRule.menu_item_id)
        .where(MenuItem.is_active == True)
        .order_by(MenuItem.category_id, MenuItem.name)
    )
    result = await db.execute(query)
    rows = result.all()

    items = []
    for item, rule in rows:
        is_sold_out = False
        allocated = None
        max_limit = None
        if rule and rule.is_active:
            allocated = rule.allocated_count
            max_limit = rule.max_production_limit
            is_sold_out = allocated >= max_limit

        item_dict = {
            "id": item.id,
            "category_id": item.category_id,
            "name": item.name,
            "description": item.description,
            "price": item.price,
            "tax_rate": item.tax_rate,
            "is_available": item.is_available and not is_sold_out,
            "is_active": item.is_active,
            "created_at": item.created_at,
            "is_sold_out": is_sold_out,
            "allocated_count": allocated,
            "max_production_limit": max_limit,
        }
        items.append(item_dict)

    return items


@router.post("/items", response_model=MenuItemResponse, status_code=201)
async def create_menu_item(data: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    item = MenuItem(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return {
        "id": item.id,
        "category_id": item.category_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "tax_rate": item.tax_rate,
        "is_available": item.is_available,
        "is_active": item.is_active,
        "created_at": item.created_at,
        "is_sold_out": False,
        "allocated_count": None,
        "max_production_limit": None,
    }


@router.put("/items/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(item_id: int, data: MenuItemUpdate, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException, status
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)

    await db.commit()
    await db.refresh(item)

    return {
        "id": item.id,
        "category_id": item.category_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "tax_rate": item.tax_rate,
        "is_available": item.is_available,
        "is_active": item.is_active,
        "created_at": item.created_at,
        "is_sold_out": False,
        "allocated_count": None,
        "max_production_limit": None,
    }


@router.delete("/items/{item_id}")
async def delete_menu_item(item_id: int, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException, status
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    item.is_active = False
    item.is_available = False
    await db.commit()
    return {"message": "Menu item deleted successfully", "id": item_id}

