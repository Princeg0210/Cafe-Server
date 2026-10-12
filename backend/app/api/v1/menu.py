import time
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_permission
from app.models.menu import MenuCategory, MenuItem, MenuItemImage
from app.models.capacity import ItemCapacityRule
from app.schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryUpdate,
    MenuCategoryResponse,
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
)
from app.api.websocket import ws_manager

router = APIRouter(prefix="/menu", tags=["Menu & Production Capacity"])

# Menu reads are public (website + QR ordering); every write requires a logged-in staff user.
STAFF_ONLY = [Depends(require_permission("pos:access"))]


@router.get("/categories", response_model=List[MenuCategoryResponse])
async def list_categories(response: Response, db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=3, stale-while-revalidate=5"
    query = select(MenuCategory).where(MenuCategory.is_active == True).order_by(MenuCategory.display_order)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/categories", response_model=MenuCategoryResponse, status_code=201, dependencies=STAFF_ONLY)
async def create_category(data: MenuCategoryCreate, db: AsyncSession = Depends(get_db)):
    category = MenuCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)

    payload = {
        "type": "MENU_UPDATED",
        "action": "CATEGORY_CREATE",
        "category_id": category.id,
        "name": category.name,
    }
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)

    return category


@router.put("/categories/{category_id}", response_model=MenuCategoryResponse, dependencies=STAFF_ONLY)
async def update_category(category_id: int, data: MenuCategoryUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(category, field, val)

    await db.commit()
    await db.refresh(category)

    payload = {
        "type": "MENU_UPDATED",
        "action": "CATEGORY_UPDATE",
        "category_id": category.id,
        "name": category.name,
    }
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)

    return category


@router.delete("/categories/{category_id}", dependencies=STAFF_ONLY)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    category.is_active = False
    await db.commit()

    payload = {
        "type": "MENU_UPDATED",
        "action": "CATEGORY_DELETE",
        "category_id": category_id,
    }
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)

    return {"message": "Category deleted successfully", "id": category_id}


@router.get("/items", response_model=List[MenuItemResponse])
async def list_menu_items(response: Response, db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=3, stale-while-revalidate=5"
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
            "image_url": item.image_url,
        }
        items.append(item_dict)

    return items


@router.post("/items", response_model=MenuItemResponse, status_code=201, dependencies=STAFF_ONLY)
async def create_menu_item(data: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    item = MenuItem(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)

    payload = {
        "type": "MENU_UPDATED",
        "action": "CREATE",
        "item_id": item.id,
        "name": item.name,
        "price": float(item.price),
        "is_available": item.is_available,
    }
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)

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
        "image_url": item.image_url,
    }


@router.put("/items/{item_id}", response_model=MenuItemResponse, dependencies=STAFF_ONLY)
async def update_menu_item(item_id: int, data: MenuItemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)

    await db.commit()
    await db.refresh(item)

    payload = {
        "type": "MENU_UPDATED",
        "action": "UPDATE",
        "item_id": item.id,
        "name": item.name,
        "price": float(item.price),
        "is_available": item.is_available,
    }
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)

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
        "image_url": item.image_url,
    }


@router.delete("/items/{item_id}", dependencies=STAFF_ONLY)
async def delete_menu_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    item.is_active = False
    item.is_available = False
    await db.commit()

    payload = {
        "type": "MENU_UPDATED",
        "action": "DELETE",
        "item_id": item_id,
    }
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)

    return {"message": "Menu item deleted successfully", "id": item_id}



# ---------------------------------------------------------------------------
# Dish photos
# ---------------------------------------------------------------------------
MAX_DISH_PHOTO_BYTES = 5 * 1024 * 1024


def _detect_image_type(data: bytes) -> str | None:
    """Trust the file's bytes, not its name or the browser's claimed type."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def _broadcast_photo_change(item: MenuItem) -> None:
    payload = {"type": "MENU_UPDATED", "action": "UPDATE", "item_id": item.id, "name": item.name,
               "price": float(item.price), "is_available": item.is_available, "image_url": item.image_url}
    for ch in ["menu", "pos", "tables", "admin"]:
        await ws_manager.broadcast(ch, payload)


@router.put("/items/{item_id}/image", dependencies=STAFF_ONLY)
async def upload_menu_item_image(item_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Add or replace a dish photo (JPG, PNG or WebP, up to 5 MB)."""
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    data = await file.read(MAX_DISH_PHOTO_BYTES + 1)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The photo file is empty.")
    if len(data) > MAX_DISH_PHOTO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Photo is too large. Please use one under 5 MB.")
    content_type = _detect_image_type(data)
    if not content_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a JPG, PNG or WebP photo.")

    image = await db.get(MenuItemImage, item_id)
    if image:
        image.content_type, image.data = content_type, data
    else:
        db.add(MenuItemImage(menu_item_id=item_id, content_type=content_type, data=data))
    # New version number in the URL so browsers and caches fetch the new photo
    item.image_url = f"/api/v1/menu/items/{item_id}/image?v={int(time.time() * 1000)}"
    await db.commit()
    await _broadcast_photo_change(item)
    return {"id": item.id, "image_url": item.image_url}


@router.delete("/items/{item_id}/image", dependencies=STAFF_ONLY)
async def delete_menu_item_image(item_id: int, db: AsyncSession = Depends(get_db)):
    """Remove the uploaded photo; the website falls back to its default picture."""
    item = await db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    image = await db.get(MenuItemImage, item_id)
    if image:
        await db.delete(image)
    item.image_url = None
    await db.commit()
    await _broadcast_photo_change(item)
    return {"id": item.id, "image_url": None}


@router.get("/items/{item_id}/image")
async def get_menu_item_image(item_id: int, db: AsyncSession = Depends(get_db)):
    """Public: serves the dish photo. URLs are versioned, so browsers may cache them for a year."""
    image = await db.get(MenuItemImage, item_id)
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photo for this dish")
    return Response(
        content=image.data,
        media_type=image.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"},
    )
