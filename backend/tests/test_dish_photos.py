"""Dish photos: staff upload / replace / remove, public serving, file checks."""
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.api.deps import get_current_user
from app.main import app
from app.models.menu import MenuCategory, MenuItem

JPEG = b"\xff\xd8\xff\xe0" + b"jpeg-body" * 20
PNG = b"\x89PNG\r\n\x1a\n" + b"png-body" * 20


async def make_item(db_session) -> MenuItem:
    cat = MenuCategory(name="Pizza", display_order=1)
    db_session.add(cat)
    await db_session.flush()
    item = MenuItem(category_id=cat.id, name="Margherita", price=Decimal("500.00"))
    db_session.add(item)
    await db_session.commit()
    return item


def upload(client: AsyncClient, item_id: int, data: bytes, name="dish.jpg", ctype="image/jpeg"):
    return client.put(f"/api/v1/menu/items/{item_id}/image", files={"file": (name, data, ctype)})


@pytest.mark.asyncio
async def test_upload_replace_and_remove_photo(db_session, client: AsyncClient):
    item = await make_item(db_session)

    first = await upload(client, item.id, JPEG)
    assert first.status_code == 200
    url = first.json()["image_url"]
    assert url.startswith(f"/api/v1/menu/items/{item.id}/image?v=")

    served = await client.get(url)
    assert served.status_code == 200
    assert served.content == JPEG
    assert served.headers["content-type"] == "image/jpeg"
    assert "immutable" in served.headers["cache-control"]

    # The menu list tells the website which photo to show
    listed = {i["id"]: i for i in (await client.get("/api/v1/menu/items")).json()}
    assert listed[item.id]["image_url"] == url

    # Replacing gives a new URL so browsers don't keep showing the old photo
    second = await upload(client, item.id, PNG, name="dish.png", ctype="image/png")
    new_url = second.json()["image_url"]
    assert new_url != url
    replaced = await client.get(new_url)
    assert replaced.content == PNG and replaced.headers["content-type"] == "image/png"

    removed = await client.delete(f"/api/v1/menu/items/{item.id}/image")
    assert removed.json()["image_url"] is None
    assert (await client.get(f"/api/v1/menu/items/{item.id}/image")).status_code == 404
    listed = {i["id"]: i for i in (await client.get("/api/v1/menu/items")).json()}
    assert listed[item.id]["image_url"] is None


@pytest.mark.asyncio
async def test_rejects_non_images_and_oversized_files(db_session, client: AsyncClient):
    item = await make_item(db_session)

    # Named and labelled as a JPG, but the bytes are not an image
    fake = await upload(client, item.id, b"<script>alert(1)</script>")
    assert fake.status_code == 400

    empty = await upload(client, item.id, b"")
    assert empty.status_code == 400

    too_big = await upload(client, item.id, JPEG + b"0" * (5 * 1024 * 1024))
    assert too_big.status_code == 413

    assert (await upload(client, 999999, JPEG)).status_code == 404


@pytest.mark.asyncio
async def test_photo_changes_need_staff_login(db_session, client: AsyncClient):
    item = await make_item(db_session)
    app.dependency_overrides.pop(get_current_user)  # act as a logged-out visitor

    assert (await upload(client, item.id, JPEG)).status_code == 401
    assert (await client.delete(f"/api/v1/menu/items/{item.id}/image")).status_code == 401
