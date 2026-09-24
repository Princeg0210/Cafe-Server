import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.schemas.pos import KOTResponse, POSSummaryResponse
from app.services.pos_service import POSService

router = APIRouter(prefix="/pos", tags=["Live POS & KOT Operations"])


@router.get("/kots", response_model=List[KOTResponse])
async def list_kots(
    target_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    date_obj = None
    if target_date:
        try:
            date_obj = datetime.date.fromisoformat(target_date)
        except ValueError:
            date_obj = None
    return await POSService.get_kots(db, target_date=date_obj, limit=limit)


@router.get("/summary", response_model=POSSummaryResponse)
async def get_pos_summary(
    target_date: Optional[str] = Query(None, description="Format YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    date_obj = None
    if target_date:
        try:
            date_obj = datetime.date.fromisoformat(target_date)
        except ValueError:
            date_obj = None
    return await POSService.get_summary(db, target_date=date_obj)


@router.post("/kots/{id}/retry-print")
async def retry_kot_print(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    return await POSService.retry_kot_print(db, kot_id=id)


@router.post("/sessions/{id}/close")
async def close_session(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    return await POSService.close_dining_session(db, session_id=id)
