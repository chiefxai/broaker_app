from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class PropertyDocument(TimestampMixin, Base):
    __tablename__ = "property_documents"
    __table_args__ = (
        CheckConstraint("size_bytes IS NULL OR size_bytes > 0", name="size_positive"),
        CheckConstraint(
            "checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'",
            name="checksum_sha256_format",
        ),
        CheckConstraint(
            "category IN ('photo', 'title_deed', 'survey', 'soil_report', 'voice_memo', 'other')",
            name="category_allowed",
        ),
        CheckConstraint("visibility IN ('private', 'shared', 'public')", name="visibility_allowed"),
        CheckConstraint(
            "upload_status IN ('pending', 'uploaded', 'rejected', 'deleted')",
            name="upload_status_allowed",
        ),
        Index("ix_property_documents_property_category", "property_id", "category"),
        Index("ix_property_documents_property_upload_status", "property_id", "upload_status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    uploaded_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    object_key: Mapped[str] = mapped_column(String(1024), unique=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64))
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, default="private", server_default="private"
    )
    upload_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
