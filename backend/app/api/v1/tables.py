import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, verify_dining_session_access, verify_dining_session_close_access
from app.models.table import Table, TableQR, DiningSession
from app.schemas.table import (
    TableResponse,
    TableQRResponse,
    QRValidateRequest,
    QRValidateResponse,
    DiningSessionResponse,
    SessionBillResponse,
)
from app.services.table_service import TableService

router = APIRouter(prefix="/tables", tags=["Tables & QR Sessions"])
sessions_router = APIRouter(prefix="/sessions", tags=["Dining Sessions"])


@router.get("", response_model=List[TableResponse])
async def list_tables(db: AsyncSession = Depends(get_db)):
    query = select(Table).order_by(Table.table_number)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{id}/qr", response_model=TableQRResponse)
async def get_table_qr(id: int, db: AsyncSession = Depends(get_db)):
    query = select(TableQR).where(TableQR.table_id == id, TableQR.is_active == True)
    result = await db.execute(query)
    qr = result.scalar_one_or_none()
    if not qr:
        qr = await TableService.rotate_qr_token(db, id)
    return qr


@router.post("/{id}/qr/rotate", response_model=TableQRResponse)
async def rotate_table_qr(id: int, db: AsyncSession = Depends(get_db)):
    return await TableService.rotate_qr_token(db, id)


@router.post("/qr/validate", response_model=QRValidateResponse)
async def validate_qr(body: QRValidateRequest, db: AsyncSession = Depends(get_db)):
    return await TableService.validate_qr_token(db, body.qr_token)


@router.post("/qr/session", response_model=DiningSessionResponse)
async def get_or_create_session_by_qr(body: QRValidateRequest, db: AsyncSession = Depends(get_db)):
    val = await TableService.validate_qr_token(db, body.qr_token)
    session = await TableService.get_or_create_dining_session(db, val.table_id)
    return session


@sessions_router.get("/{id}", response_model=DiningSessionResponse)
async def get_dining_session(
    id: int,
    session: DiningSession = Depends(verify_dining_session_access),
):
    return session


@sessions_router.get("/{id}/bill", response_model=SessionBillResponse)
async def get_session_bill(
    id: int,
    db: AsyncSession = Depends(get_db),
    session: DiningSession = Depends(verify_dining_session_access),
):
    return await TableService.get_session_bill(db, id)


@sessions_router.post("/{id}/close", response_model=DiningSessionResponse)
async def close_session(
    id: int,
    db: AsyncSession = Depends(get_db),
    session: DiningSession = Depends(verify_dining_session_close_access),
):
    return await TableService.close_dining_session(db, id)


router.include_router(sessions_router)

