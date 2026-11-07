from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_is_active", "is_active"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    identity_sub: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    account_email: Mapped[str] = mapped_column(String(320), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )


class PasswordCredential(TimestampMixin, Base):
    __tablename__ = "password_credentials"
    __table_args__ = (UniqueConstraint("email", name="uq_password_credentials_email"),)

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)


class BrokerProfile(TimestampMixin, Base):
    __tablename__ = "broker_profiles"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    legal_name: Mapped[str | None] = mapped_column(String(200))
    mobile_phone: Mapped[str | None] = mapped_column(String(40))
    operating_language: Mapped[str] = mapped_column(String(12), nullable=False, default="en")
    designation: Mapped[str | None] = mapped_column(String(200))
    license_number: Mapped[str | None] = mapped_column(String(100))
    license_jurisdiction: Mapped[str | None] = mapped_column(String(100))


class BusinessProfile(TimestampMixin, Base):
    __tablename__ = "business_profiles"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    business_name: Mapped[str | None] = mapped_column(String(200))
    public_phone: Mapped[str | None] = mapped_column(String(40))
    public_email: Mapped[str | None] = mapped_column(String(320))
    city: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))


class UserPreference(TimestampMixin, Base):
    __tablename__ = "user_preferences"
    __table_args__ = (
        CheckConstraint("theme IN ('light', 'dark')", name="theme_allowed"),
        CheckConstraint(
            "default_expiration_days IS NULL OR default_expiration_days IN (1, 7, 30, 90, 365)",
            name="default_expiration_days_allowed",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    theme: Mapped[str] = mapped_column(
        String(10), nullable=False, default="light", server_default="light"
    )
    language: Mapped[str] = mapped_column(
        String(12), nullable=False, default="en", server_default="en"
    )
    default_disclosures: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    default_expiration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)


class OnboardingProgress(TimestampMixin, Base):
    __tablename__ = "onboarding_progress"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(completed_steps) = 'array'", name="completed_steps_array"),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    current_step: Mapped[str | None] = mapped_column(String(80))
    completed_steps: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default="[]"
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
