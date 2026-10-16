import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    DateTime,
    Boolean,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    custom_domain = Column(String(255), unique=True, nullable=True, index=True)

    # Visual & Brand Tokens
    logo_url = Column(String(512), nullable=True)
    favicon_url = Column(String(512), nullable=True)
    hero_image_url = Column(String(512), nullable=True)
    hero_video_url = Column(String(512), nullable=True)
    tagline = Column(String(255), nullable=True)
    about_text = Column(Text, nullable=True)
    primary_color = Column(String(16), default="#2B1810")
    secondary_color = Column(String(16), default="#F7F4EE")
    accent_color = Column(String(16), default="#C86D51")

    # Store Contact & Policy Configuration
    phone = Column(String(32), nullable=True)
    email = Column(String(128), nullable=True)
    address = Column(Text, nullable=True)
    google_maps_url = Column(String(512), nullable=True)
    reservation_closed_weekdays = Column(String(32), default="1,2")
    reservation_open_time = Column(String(8), default="11:00")
    reservation_last_slot_time = Column(String(8), default="22:30")
    deposit_per_guest = Column(Numeric(10, 2), default=Decimal("150.00"))

    # Direct Payments (0% Commission Routing)
    merchant_upi_id = Column(String(128), nullable=True)
    merchant_name = Column(String(128), nullable=True)
    razorpay_key_id = Column(String(128), nullable=True)
    razorpay_key_secret = Column(String(256), nullable=True)
    razorpay_webhook_secret = Column(String(256), nullable=True)
    allow_online_payments = Column(Boolean, default=True)

    # Subscription & Lifecycle
    plan_tier = Column(String(32), default="TRIAL")  # TRIAL, STARTER, GROWTH, ENTERPRISE
    subscription_status = Column(String(32), default="ACTIVE")  # ACTIVE, PAST_DUE, CANCELLED
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
