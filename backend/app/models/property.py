from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Property(TimestampMixin, Base):
    __tablename__ = "properties"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'active', 'archived')", name="status_allowed"),
        Index("ix_properties_owner_status_updated", "owner_user_id", "status", "updated_at"),
        Index(
            "ix_properties_owner_category_status", "owner_user_id", "primary_category_id", "status"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    primary_category_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("property_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft"
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PropertyLocation(TimestampMixin, Base):
    __tablename__ = "property_locations"
    __table_args__ = (
        CheckConstraint(
            "(latitude IS NULL AND longitude IS NULL) OR "
            "(latitude IS NOT NULL AND longitude IS NOT NULL)",
            name="coordinates_paired",
        ),
        CheckConstraint("latitude IS NULL OR latitude BETWEEN -90 AND 90", name="latitude_range"),
        CheckConstraint(
            "longitude IS NULL OR longitude BETWEEN -180 AND 180", name="longitude_range"
        ),
        CheckConstraint("width_ft IS NULL OR width_ft >= 0", name="width_nonnegative"),
        CheckConstraint("length_ft IS NULL OR length_ft >= 0", name="length_nonnegative"),
        CheckConstraint(
            "road_width_ft IS NULL OR road_width_ft >= 0", name="road_width_nonnegative"
        ),
        CheckConstraint(
            "highway_distance_km IS NULL OR highway_distance_km >= 0",
            name="highway_distance_nonnegative",
        ),
        Index("ix_property_locations_district_state", "district", "state"),
    )

    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )
    address_line: Mapped[str | None] = mapped_column(String(500))
    village: Mapped[str | None] = mapped_column(String(150))
    pincode: Mapped[str | None] = mapped_column(String(20))
    taluk: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country_code: Mapped[str | None] = mapped_column(String(2))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    survey_numbers: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    width_ft: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    length_ft: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    frontage_direction: Mapped[str | None] = mapped_column(String(20))
    road_width_ft: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    road_access_type: Mapped[str | None] = mapped_column(String(80))
    road_subdivision_basis: Mapped[str | None] = mapped_column(String(200))
    highway_distance_km: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))


class PropertyFeatures(TimestampMixin, Base):
    __tablename__ = "property_features"
    __table_args__ = (
        CheckConstraint(
            "soil_type IS NULL OR soil_type IN ('red', 'black', 'alluvial', 'sandy_loam', 'other')",
            name="soil_type_allowed",
        ),
        CheckConstraint("water_tds_ppm IS NULL OR water_tds_ppm >= 0", name="tds_nonnegative"),
        CheckConstraint(
            "(soil_type = 'other' AND soil_type_other IS NOT NULL) OR "
            "(soil_type IS DISTINCT FROM 'other' AND soil_type_other IS NULL)",
            name="soil_other_consistent",
        ),
    )

    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )
    soil_type: Mapped[str | None] = mapped_column(String(40))
    soil_type_other: Mapped[str | None] = mapped_column(String(120))
    water_tds_ppm: Mapped[int | None] = mapped_column(Integer)
    agronomist_notes: Mapped[str | None] = mapped_column(Text)


class PropertyWaterSource(TimestampMixin, Base):
    __tablename__ = "property_water_sources"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('river', 'canal', 'borewell', 'open_well', "
            "'government_supply', 'other')",
            name="source_type_allowed",
        ),
        CheckConstraint("depth_ft IS NULL OR depth_ft >= 0", name="depth_nonnegative"),
        CheckConstraint("diameter_ft IS NULL OR diameter_ft >= 0", name="diameter_nonnegative"),
        CheckConstraint("yield_inches IS NULL OR yield_inches >= 0", name="yield_nonnegative"),
        Index("ix_property_water_sources_property", "property_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str | None] = mapped_column(String(160))
    depth_ft: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    diameter_ft: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    yield_inches: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    seasonality: Mapped[str | None] = mapped_column(String(200))
    details: Mapped[str | None] = mapped_column(Text)


class PropertyUtility(TimestampMixin, Base):
    __tablename__ = "property_utilities"
    __table_args__ = (
        CheckConstraint(
            "utility_type IN ('electricity', 'irrigation', 'fencing', 'road_access', 'other')",
            name="utility_type_allowed",
        ),
        Index("ix_property_utilities_property", "property_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    utility_type: Mapped[str] = mapped_column(String(40), nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    details: Mapped[str | None] = mapped_column(Text)


class PropertyFinancials(TimestampMixin, Base):
    __tablename__ = "property_financials"
    __table_args__ = (
        CheckConstraint(
            "asking_price_inr IS NULL OR asking_price_inr >= 0", name="asking_price_nonnegative"
        ),
        CheckConstraint(
            "minimum_price_inr IS NULL OR minimum_price_inr >= 0", name="minimum_price_nonnegative"
        ),
        CheckConstraint(
            "minimum_price_inr IS NULL OR asking_price_inr IS NULL "
            "OR minimum_price_inr <= asking_price_inr",
            name="minimum_price_le_asking_price",
        ),
        CheckConstraint("area IS NULL OR area > 0", name="area_positive"),
        CheckConstraint(
            "(area IS NULL AND area_unit IS NULL) OR (area IS NOT NULL AND area_unit IS NOT NULL)",
            name="area_unit_paired",
        ),
        CheckConstraint(
            "advance_amount_inr IS NULL OR advance_amount_inr >= 0", name="advance_nonnegative"
        ),
        CheckConstraint(
            "outstanding_loan_inr IS NULL OR outstanding_loan_inr >= 0", name="loan_nonnegative"
        ),
        Index("ix_property_financials_asking_price", "asking_price_inr"),
        Index("ix_property_financials_area_unit_area", "area_unit", "area"),
    )

    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default="INR"
    )
    asking_price_inr: Mapped[int | None] = mapped_column(BigInteger)
    minimum_price_inr: Mapped[int | None] = mapped_column(BigInteger)
    negotiable: Mapped[bool | None] = mapped_column(Boolean)
    area: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    area_unit: Mapped[str | None] = mapped_column(String(30))
    advance_amount_inr: Mapped[int | None] = mapped_column(BigInteger)
    payment_milestones_flexible: Mapped[bool | None] = mapped_column(Boolean)
    lending_bank: Mapped[str | None] = mapped_column(String(200))
    outstanding_loan_inr: Mapped[int | None] = mapped_column(BigInteger)


class PropertyLegalDetails(TimestampMixin, Base):
    __tablename__ = "property_legal_details"
    __table_args__ = (
        CheckConstraint(
            "title_classification IS NULL OR title_classification IN "
            "('ryotwari_patta', 'natham', 'gramathu_natham', 'other')",
            name="title_classification_allowed",
        ),
    )

    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )
    title_classification: Mapped[str | None] = mapped_column(String(40))
    legal_summary: Mapped[str | None] = mapped_column(Text)


class PropertyNote(TimestampMixin, Base):
    """One editable private notes field per property for the single-broker MVP."""

    __tablename__ = "property_notes"

    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")


class PropertySigningAuthority(TimestampMixin, Base):
    """A person recorded as authorized to sign for one property."""

    __tablename__ = "property_signing_authorities"
    __table_args__ = (
        CheckConstraint("verification_status = 'pending'", name="verification_status_pending"),
        CheckConstraint("signature_status = 'pending'", name="signature_status_pending"),
        Index("ix_property_signing_authorities_property", "property_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    relationship: Mapped[str] = mapped_column(String(120), nullable=False)
    record_label: Mapped[str | None] = mapped_column(String(120))
    record_value: Mapped[str | None] = mapped_column(String(255))
    # Verification and signature states remain server-controlled until the product
    # implements a real identity/document verification workflow.
    verification_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    signature_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
