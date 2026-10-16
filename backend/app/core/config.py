import json
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    APP_NAME: str = "Jaadoo Udaipur Cafe API"
    SECRET_KEY: str = "super-secret-key-minimum-32-characters-long-jaadoo-udaipur"

    # Configurable Billing & Taxation Settings
    DEFAULT_TAX_RATE: str = "0.05"

    # PostgreSQL Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "cafe_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cafe_db"

    # Redis Cache & Pub/Sub
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery Workers
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Default staff accounts, created on startup only if missing (never overwritten).
    # Required outside development; unset means the account is not auto-created.
    DEFAULT_ADMIN_PASSWORD: Optional[str] = None
    DEFAULT_POS_PASSWORD: Optional[str] = None
    DEFAULT_MANAGER_PASSWORD: Optional[str] = None

    # JWT Authentication (All portal logins expire after 5 hours)
    JWT_SECRET_KEY: str = "change-this-jwt-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 300  # 5 hours (300 minutes)
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 300  # 5 hours (300 minutes)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 1

    # Merchant UPI Payment Settings (Direct to bank, 0% commission)
    MERCHANT_UPI_ID: str = "restrova@ybl"
    MERCHANT_NAME: str = "Restrova Cafe"

    # Razorpay Payment Gateway & Testing Portal
    RAZORPAY_KEY_ID: str = "rzp_test_JaadooCafe10"
    RAZORPAY_KEY_SECRET: str = "jaadoo_secret_test_2026"
    RAZORPAY_WEBHOOK_SECRET: str = "jaadoo_webhook_secret_2026"
    RAZORPAY_TEST_MODE: bool = True
    # Simulated/unsigned payments are accepted in development or test simulation
    ALLOW_TEST_PAYMENTS: bool = True
    # Shared secret the bank/acquirer sends as X-Webhook-Secret. Required outside development.
    BANK_WEBHOOK_SECRET: Optional[str] = None

    # WhatsApp booking notifications (Meta WhatsApp Cloud API). Unset token/phone ID = disabled.
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_API_VERSION: str = "v21.0"
    WHATSAPP_TEMPLATE_LANGUAGE: str = "en"
    WHATSAPP_CONFIRMATION_TEMPLATE: str = "booking_confirmation"
    WHATSAPP_CANCELLATION_TEMPLATE: str = "booking_cancellation"

    # Supplier bill scanning (Sarvam Document AI / OCR)
    SARVAM_API_KEY: Optional[str] = None
    SARVAM_BASE_URL: str = "https://api.sarvam.ai"
    SARVAM_DOCUMENT_MODEL: str = "sarvam-vision-2.1"

    # Subtract recipe ingredients from inventory on every order (and refuse orders when stock is short).
    # Off for now: stock only changes through admin adjustments and scanned supplier bills.
    INVENTORY_AUTO_DEDUCT: bool = False

    # Booking rules checked on every new booking (website, holds, staff-created)
    BOOKING_RULES_ENFORCED: bool = True
    RESERVATION_CLOSED_WEEKDAYS: str = "1,2"  # Python weekday numbers: Mon=0 ... Sun=6 (Tue, Wed closed)
    RESERVATION_OPEN_TIME: str = "11:00"  # earliest bookable slot start (24h)
    RESERVATION_LAST_SLOT_TIME: str = "22:30"  # latest bookable slot start (24h)

    # Reservation Deposit & Hold Settings
    DEFAULT_DEPOSIT_PER_GUEST: str = "150.00"
    RESERVATION_HOLD_MINUTES: int = 7
    DEFAULT_RESERVATION_PIZZA_DEMAND_PER_GUEST: str = "0.75"


    # Android Payment Listener Security
    ANDROID_DEVICE_SECRET: str = "cafe-jaadoo-android-listener-secret-2026"
    ANDROID_DEVICE_TOKEN: str = "dev_token_jaadoo_android_phone_9460555743"

    # Reservation Deposit Remainder & Cancellation Policies
    DEFAULT_DEPOSIT_REMAINDER_POLICY: str = "CUSTOMER_CREDIT"  # REFUND_REMAINDER, CUSTOMER_CREDIT, FORFEIT_REMAINDER
    DEFAULT_CANCELLATION_POLICY: str = "REFUND_BEFORE_CUTOFF"  # FULL_REFUND, REFUND_BEFORE_CUTOFF, NO_REFUND
    DEFAULT_CANCELLATION_CUTOFF_HOURS: int = 2
    DEFAULT_CANCELLATION_REFUND_PERCENTAGE: int = 100
    DEFAULT_NO_SHOW_POLICY: str = "FORFEIT"  # FORFEIT, PARTIAL_CREDIT

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v


settings = Settings()
