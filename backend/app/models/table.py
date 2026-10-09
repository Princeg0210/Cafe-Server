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

    @property
    def floor_number(self) -> int:
        if self.id:
            if self.id <= 3: return 1
            if self.id <= 6: return 2
            if self.id <= 8: return 3
            if self.id <= 10: return 4
            if self.id <= 13: return 5
            return 6
        digits = "".join(filter(str.isdigit, str(self.table_number)))
        num = int(digits) if digits else 1
        if num <= 3: return 1
        if num <= 6: return 2
        if num <= 8: return 3
        if num <= 10: return 4
        if num <= 13: return 5
        return 6

    @property
    def floor_table_num(self) -> int:
        if self.id:
            if self.id <= 3: return self.id
            if self.id <= 6: return self.id - 3
            if self.id <= 8: return self.id - 6
            if self.id <= 10: return self.id - 8
            if self.id <= 13: return self.id - 10
            return 1
        digits = "".join(filter(str.isdigit, str(self.table_number)))
        num = int(digits) if digits else 1
        if num <= 3: return num
        if num <= 6: return num - 3
        if num <= 8: return num - 6
        if num <= 10: return num - 8
        if num <= 13: return num - 10
        return 1

    @property
    def floor_name(self) -> str:
        names = {
            1: "Ground floor",
            2: "School room",
            3: "Balcony",
            4: "Lower top",
            5: "Top top",
            6: "Everest (coming soon)",
        }
        return names.get(self.floor_number, "Ground floor")

    @property
    def qr_token(self) -> str | None:
        return self.qr_code.qr_token if self.qr_code else None


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
    reservation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("reservations.id", ondelete="SET NULL", use_alter=True), nullable=True)
    session_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="OPENED", nullable=False)  # OPENED, ACTIVE, CHECKOUT, PAID, CLOSED
    opened_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    closed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    table = relationship("Table", back_populates="dining_sessions")
    customer = relationship("Customer", back_populates="dining_sessions")
    reservation = relationship("Reservation", foreign_keys=[reservation_id], lazy="selectin")
    orders = relationship("Order", back_populates="dining_session")
    kots = relationship("KOT", back_populates="dining_session")
    bills = relationship("Bill", back_populates="dining_session")
    feedback = relationship("Feedback", back_populates="dining_session")
