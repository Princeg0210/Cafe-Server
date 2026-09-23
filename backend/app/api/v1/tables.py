import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.models.table import Table, TableQR, DiningSession
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/tables", tags=["Tables & QR Sessions"])


class TableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    branch_id: int
    table_number: str
    capacity: int
    status: str


class QRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_id: int
    qr_token: str
    is_active: bool


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    table_id: int
    session_token: str
    status: str


@router.get("", response_model=List[TableResponse])
async def list_tables(db: AsyncSession = Depends(get_db)):
    query = select(Table).order_by(Table.table_number)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{id}/qr", response_model=QRResponse)
async def get_table_qr(id: int, db: AsyncSession = Depends(get_db)):
    query = select(TableQR).where(TableQR.table_id == id)
    result = await db.execute(query)
    qr = result.scalar_one_or_none()
    if not qr:
        # Auto generate QR token if missing
        qr = TableQR(table_id=id, qr_token=f"qr-tbl-{id}-sec-token-{uuid.uuid4().hex[:6]}")
        db.add(qr)
        await db.commit()
        await db.refresh(qr)
    return qr


@router.post("/{id}/session", response_model=SessionResponse)
async def open_table_session(id: int, db: AsyncSession = Depends(get_db)):
    query = select(DiningSession).where(DiningSession.table_id == id, DiningSession.status.in_(["OPENED", "ACTIVE"]))
    result = await db.execute(query)
    session = result.scalar_one_or_none()

    if not session:
        session = DiningSession(
            table_id=id,
            session_token=f"sess-{uuid.uuid4().hex[:12]}",
            status="ACTIVE",
        )
        db.add(session)

        # Update table status to Occupied
        tbl_query = select(Table).where(Table.id == id)
        tbl_res = await db.execute(tbl_query)
        table = tbl_res.scalar_one_or_none()
        if table:
            table.status = "Occupied"

        await db.commit()
        await db.refresh(session)

    return session
