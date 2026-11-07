from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import APIModel

PropertyStatus = Literal["draft", "active", "archived"]
SoilType = Literal["red", "black", "alluvial", "sandy_loam", "other"]
WaterSourceType = Literal["river", "canal", "borewell", "open_well", "government_supply", "other"]
UtilityType = Literal["electricity", "irrigation", "fencing", "road_access", "other"]
TitleClassification = Literal["ryotwari_patta", "natham", "gramathu_natham", "other"]
CategoryCode = Annotated[str, Field(min_length=1, max_length=50, pattern=r"^[a-z][a-z0-9_]*$")]


class PropertyCreate(APIModel):
    title: str = Field(min_length=1, max_length=200)
    category: CategoryCode


class PropertyPatch(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    category: CategoryCode | None = None

    @model_validator(mode="after")
    def require_at_least_one_change(self) -> "PropertyPatch":
        if not self.model_fields_set:
            raise ValueError("At least one property field must be provided")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("title cannot be null")
        if "category" in self.model_fields_set and self.category is None:
            raise ValueError("category cannot be null")
        return self


class PropertySummary(APIModel):
    id: UUID
    title: str
    category: str
    status: PropertyStatus
    completion_percent: int = Field(ge=0, le=100)
    created_at: datetime
    updated_at: datetime


class PropertyLocationUpdate(APIModel):
    address_line: str | None = Field(default=None, max_length=500)
    village: str | None = Field(default=None, max_length=150)
    pincode: str | None = Field(default=None, max_length=20)
    taluk: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    survey_numbers: list[str] = Field(default_factory=list, max_length=50)
    width_ft: Decimal | None = Field(default=None, ge=0, le=9999999999)
    length_ft: Decimal | None = Field(default=None, ge=0, le=9999999999)
    frontage_direction: str | None = Field(default=None, max_length=20)
    road_width_ft: Decimal | None = Field(default=None, ge=0, le=9999999999)
    road_access_type: str | None = Field(default=None, max_length=80)
    road_subdivision_basis: str | None = Field(default=None, max_length=200)
    highway_distance_km: Decimal | None = Field(default=None, ge=0, le=99999999)

    @model_validator(mode="after")
    def coordinates_must_be_paired(self) -> "PropertyLocationUpdate":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be supplied together")
        return self


class WaterSourceInput(APIModel):
    source_type: WaterSourceType
    label: str | None = Field(default=None, max_length=160)
    depth_ft: Decimal | None = Field(default=None, ge=0)
    diameter_ft: Decimal | None = Field(default=None, ge=0)
    yield_inches: Decimal | None = Field(default=None, ge=0)
    seasonality: str | None = Field(default=None, max_length=200)
    details: str | None = Field(default=None, max_length=5000)


class UtilityInput(APIModel):
    utility_type: UtilityType
    available: bool
    details: str | None = Field(default=None, max_length=5000)


class PropertyFeaturesUpdate(APIModel):
    soil_type: SoilType | None = None
    soil_type_other: str | None = Field(default=None, max_length=120)
    water_tds_ppm: int | None = Field(default=None, ge=0, le=2_147_483_647)
    agronomist_notes: str | None = Field(default=None, max_length=10_000)
    water_sources: list[WaterSourceInput] = Field(default_factory=list, max_length=50)
    utilities: list[UtilityInput] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def custom_soil_requires_description(self) -> "PropertyFeaturesUpdate":
        if self.soil_type == "other" and not self.soil_type_other:
            raise ValueError("soil_type_other is required when soil_type is 'other'")
        if self.soil_type != "other" and self.soil_type_other is not None:
            raise ValueError("soil_type_other is only allowed when soil_type is 'other'")
        return self


class PropertyFinancialsUpdate(APIModel):
    currency: Literal["INR"] = "INR"
    asking_price_inr: int | None = Field(default=None, ge=0)
    minimum_price_inr: int | None = Field(default=None, ge=0)
    negotiable: bool | None = None
    area: Decimal | None = Field(default=None, gt=0, max_digits=18, decimal_places=4)
    area_unit: str | None = Field(default=None, min_length=1, max_length=30)
    advance_amount_inr: int | None = Field(default=None, ge=0)
    payment_milestones_flexible: bool | None = None
    lending_bank: str | None = Field(default=None, max_length=200)
    outstanding_loan_inr: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def financial_fields_are_consistent(self) -> "PropertyFinancialsUpdate":
        if (
            self.minimum_price_inr is not None
            and self.asking_price_inr is not None
            and self.minimum_price_inr > self.asking_price_inr
        ):
            raise ValueError("minimum_price_inr cannot exceed asking_price_inr")
        if (self.area is None) != (self.area_unit is None):
            raise ValueError("area and area_unit must be supplied together")
        return self


class PropertyLegalDetailsUpdate(APIModel):
    title_classification: TitleClassification | None = None
    legal_summary: str | None = Field(default=None, max_length=10_000)


class PropertyNoteUpdate(APIModel):
    notes: str | None = Field(default=None, max_length=20_000)


class PropertyDetail(PropertySummary):
    description: str | None = None
    location: PropertyLocationUpdate | None = None
    features: PropertyFeaturesUpdate | None = None
    financials: PropertyFinancialsUpdate | None = None
    legal: PropertyLegalDetailsUpdate | None = None


class PropertyPage(APIModel):
    items: list[PropertySummary]
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    total: int = Field(ge=0)


class PropertyCategoryRead(APIModel):
    code: CategoryCode
    label: str = Field(min_length=1, max_length=100)
    sort_order: int = Field(ge=0)
    enabled: bool = True


class UserPropertyCategoryInput(APIModel):
    code: CategoryCode
    enabled: bool
    sort_order: int = Field(ge=0)


class UserPropertyCategoriesUpdate(APIModel):
    items: list[UserPropertyCategoryInput] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def category_codes_must_be_unique(self) -> "UserPropertyCategoriesUpdate":
        codes = [item.code for item in self.items]
        if len(codes) != len(set(codes)):
            raise ValueError("category codes must be unique")
        return self


class DashboardRead(APIModel):
    property_counts: dict[PropertyStatus, int]
    recent_properties: list[PropertySummary]
