import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.utils.helpers import utc_now


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    branch_id: Mapped[int] = mapped_column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    table_number: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    status: Mapped[str] = mapped_column(String(20), default="Available", nullable=False)  # Available, Occupied, Reserved

    branch = relationship("Branch", back_populates="tables")
    qr_code = relationship("TableQR", back_populates="table", uselist=False)
    dining_sessions = relationship("DiningSession", back_populates="table")


class TableQR(Base):
    __tablename__ = "table_qr"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    table_id: Mapped[int] = mapped_column(Integer, ForeignKey("tables.id", ondelete="CASCADE"), unique=True, nullable=False)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    table = relationship("Table", back_populates="qr_code")


class DiningSession(Base):
    __tablename__ = "dining_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    table_id: Mapped[int] = mapped_column(Integer, ForeignKey("tables.id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    session_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="OPENED", nullable=False)  # OPENED, ACTIVE, CHECKOUT, PAID, CLOSED
    opened_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    closed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    table = relationship("Table", back_populates="dining_sessions")
    customer = relationship("Customer", back_populates="dining_sessions")
    orders = relationship("Order", back_populates="dining_session")
    kots = relationship("KOT", back_populates="dining_session")
    bills = relationship("Bill", back_populates="dining_session")
    feedback = relationship("Feedback", back_populates="dining_session")
