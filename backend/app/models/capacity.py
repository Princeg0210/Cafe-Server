import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.utils.helpers import utc_now


class ItemCapacityRule(Base):
    __tablename__ = "item_capacity_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), unique=True, nullable=False)
    max_production_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    allocated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reset_period: Mapped[str] = mapped_column(String(20), default="DAILY", nullable=False)  # DAILY, SHIFT, MANUAL
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    menu_item = relationship("MenuItem", back_populates="capacity_rule")
