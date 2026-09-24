import datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.utils.helpers import utc_now


class KOT(Base):
    __tablename__ = "kots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    kot_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    business_date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    table_id: Mapped[int] = mapped_column(Integer, ForeignKey("tables.id", ondelete="CASCADE"), nullable=False)
    dining_session_id: Mapped[int] = mapped_column(Integer, ForeignKey("dining_sessions.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), default="GENERATED", nullable=False)  # GENERATED, COMPLETED, CANCELLED
    printed_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # PENDING, PRINTED, FAILED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, nullable=False)

    table = relationship("Table")
    dining_session = relationship("DiningSession", back_populates="kots")
    order = relationship("Order", back_populates="kot", uselist=False)
    print_jobs = relationship("PrintJob", back_populates="kot", cascade="all, delete-orphan")
