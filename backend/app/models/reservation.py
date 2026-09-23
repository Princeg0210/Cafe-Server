import datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.utils.helpers import utc_now


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    branch_id: Mapped[int] = mapped_column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    guest_count: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    reservation_date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    time_slot: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # e.g., "19:00-20:00"
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED", nullable=False)  # CONFIRMED, CANCELLED, COMPLETED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, nullable=False)

    branch = relationship("Branch", back_populates="reservations")
    customer = relationship("Customer", back_populates="reservations")


class ReservationCapacityRule(Base):
    __tablename__ = "reservation_capacity_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    branch_id: Mapped[int] = mapped_column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(20), nullable=False)
    max_guest_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    branch = relationship("Branch", back_populates="capacity_rules")
