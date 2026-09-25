import json
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
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

    # JWT Authentication
    JWT_SECRET_KEY: str = "super-secret-jwt-key-jaadoo-udaipur"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Merchant UPI Payment Settings (Direct to bank, 0% commission)
    MERCHANT_UPI_ID: str = "jaadoo.udaipur@icici"
    MERCHANT_NAME: str = "Jaadoo Cafe Piza"

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
