import datetime
from decimal import Decimal
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Time, Numeric
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
    table_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("tables.id", ondelete="SET NULL"), nullable=True)
    floor_number: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1)
    table_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED", nullable=False)  # HOLD, PAYMENT_PENDING, CONFIRMED, ARRIVED, SEATED, COMPLETED, CANCELLED, NO_SHOW, EXPIRED
    payment_status: Mapped[str] = mapped_column(String(30), default="PAID", nullable=False)  # PENDING, PENDING_VERIFICATION, PAID, EXPIRED, CANCELLED, REFUNDED
    advance_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True, default=Decimal("0.00"))
    payment_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    hold_expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    upi_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    upi_utr: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_deposit_credited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    credited_bill_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("bills.id", ondelete="SET NULL", use_alter=True), nullable=True)
    cancellation_refund_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True, default=Decimal("0.00"))
    cancellation_refund_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, nullable=False)

    branch = relationship("Branch", back_populates="reservations")
    customer = relationship("Customer", back_populates="reservations")
    table = relationship("Table", foreign_keys=[table_id], lazy="selectin")


class ReservationCapacityRule(Base):
    __tablename__ = "reservation_capacity_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    branch_id: Mapped[int] = mapped_column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(20), nullable=False)
    max_guest_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    branch = relationship("Branch", back_populates="capacity_rules")
