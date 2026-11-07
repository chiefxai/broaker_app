from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ShareLink(TimestampMixin, Base):
    __tablename__ = "share_links"
    __table_args__ = (
        CheckConstraint("octet_length(token_hash) = 32", name="token_hash_sha256_length"),
        CheckConstraint(
            "expires_at IS NULL OR expires_at > created_at", name="expiry_after_create"
        ),
        CheckConstraint(
            "visibility IN ('private', 'protected', 'unlisted')",
            name="share_link_visibility_valid",
        ),
        CheckConstraint(
            "visibility != 'protected' OR passcode_hash IS NOT NULL",
            name="protected_share_link_has_passcode",
        ),
        Index("ix_share_links_property_state", "property_id", "revoked_at", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    created_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True, nullable=False)
    token_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary())
    title: Mapped[str | None] = mapped_column(String(200))
    visibility: Mapped[str] = mapped_column(
        String(16), nullable=False, default="unlisted", server_default=text("'unlisted'")
    )
    passcode_hash: Mapped[str | None] = mapped_column(String(256))
    disclosures: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProfileShareLink(TimestampMixin, Base):
    __tablename__ = "profile_share_links"
    __table_args__ = (
        CheckConstraint(
            "octet_length(token_hash) = 32", name="profile_share_token_hash_sha256_length"
        ),
        CheckConstraint(
            "expires_at IS NULL OR expires_at > created_at",
            name="profile_share_expiry_after_create",
        ),
        CheckConstraint(
            "visibility IN ('protected', 'unlisted')", name="profile_share_visibility_valid"
        ),
        CheckConstraint(
            "visibility != 'protected' OR passcode_hash IS NOT NULL",
            name="profile_share_protected_has_passcode",
        ),
        CheckConstraint("include_profile OR include_properties", name="profile_share_has_content"),
        Index("ix_profile_share_links_owner_state", "owner_user_id", "revoked_at", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True, nullable=False)
    token_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary())
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    include_profile: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default=text("true")
    )
    include_properties: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default=text("true")
    )
    property_disclosures: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'")
    )
    property_ids: Mapped[list[str] | None] = mapped_column(JSONB)
    visibility: Mapped[str] = mapped_column(
        String(16), nullable=False, default="unlisted", server_default=text("'unlisted'")
    )
    passcode_hash: Mapped[str | None] = mapped_column(String(256))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
