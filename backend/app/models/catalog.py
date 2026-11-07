from __future__ import annotations

from datetime import datetime
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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PropertyCategory(TimestampMixin, Base):
    __tablename__ = "property_categories"
    __table_args__ = (
        UniqueConstraint("code", name="uq_property_categories_code"),
        CheckConstraint("code ~ '^[a-z][a-z0-9_]*$'", name="code_format"),
        CheckConstraint("length(trim(label)) > 0", name="label_nonempty"),
        CheckConstraint("sort_order >= 0", name="sort_order_nonnegative"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


class UserPropertyCategory(Base):
    __tablename__ = "user_property_categories"
    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="sort_order_nonnegative"),
        Index("ix_user_property_categories_user_enabled", "user_id", "enabled"),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("property_categories.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class PropertySecondaryCategory(Base):
    __tablename__ = "property_secondary_categories"
    __table_args__ = (
        UniqueConstraint(
            "property_id", "category_id", name="uq_property_secondary_categories_pair"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("property_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
