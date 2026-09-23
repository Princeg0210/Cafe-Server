import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Kitchen(Base):
    __tablename__ = "kitchens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    branch_id: Mapped[int] = mapped_column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # Kitchen 1 - Hot Food, Kitchen 2 - Bar/Beverages

    branch = relationship("Branch", back_populates="kitchens")
    menu_mappings = relationship("MenuItemKitchenMapping", back_populates="kitchen")
    kitchen_orders = relationship("KitchenOrder", back_populates="kitchen")
    printers = relationship("KitchenPrinter", back_populates="kitchen")


class MenuItemKitchenMapping(Base):
    __tablename__ = "menu_item_kitchen_mapping"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    kitchen_id: Mapped[int] = mapped_column(Integer, ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False)

    menu_item = relationship("MenuItem", back_populates="kitchen_mappings")
    kitchen = relationship("Kitchen", back_populates="menu_mappings")


class KitchenOrder(Base):
    __tablename__ = "kitchen_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    kitchen_id: Mapped[int] = mapped_column(Integer, ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SENT", nullable=False)  # SENT, PREPARING, READY, SERVED
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="kitchen_orders")
    kitchen = relationship("Kitchen", back_populates="kitchen_orders")
    print_jobs = relationship("PrintJob", back_populates="kitchen_order")


class KitchenPrinter(Base):
    __tablename__ = "kitchen_printers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    kitchen_id: Mapped[int] = mapped_column(Integer, ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False)
    printer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    kitchen = relationship("Kitchen", back_populates="printers")
    print_jobs = relationship("PrintJob", back_populates="printer")


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    kitchen_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("kitchen_orders.id", ondelete="CASCADE"), nullable=False)
    printer_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("kitchen_printers.id", ondelete="SET NULL"), nullable=True)
    ticket_content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # PENDING, PRINTING, PRINTED, FAILED, RETRYING, CANCELLED
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    kitchen_order = relationship("KitchenOrder", back_populates="print_jobs")
    printer = relationship("KitchenPrinter", back_populates="print_jobs")
