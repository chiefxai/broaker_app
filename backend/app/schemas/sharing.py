from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, SecretStr, field_validator, model_validator

from app.schemas.common import APIModel


class ShareDisclosures(APIModel):
    show_name: bool = True
    show_description: bool = True
    show_location: bool = True
    show_price: bool = False
    show_specifications: bool = True
    show_exact_coordinates: bool = False
    show_photos: bool = True
    show_documents: bool = False
    show_broker_contact: bool = False
    # Kept for existing share links and older clients. New clients use show_documents.
    show_reports: bool = False
    show_approach_roads: bool = False


class ShareLinkCreate(APIModel):
    title: str = Field(min_length=1, max_length=200)
    expires_at: datetime | None = None
    disclosures: ShareDisclosures
    visibility: str = "unlisted"
    passcode: SecretStr | None = Field(default=None, min_length=6, max_length=12)

    @field_validator("visibility")
    @classmethod
    def visibility_is_supported(cls, value: str) -> str:
        if value not in {"private", "protected", "unlisted"}:
            raise ValueError("visibility must be private, protected, or unlisted")
        return value

    @model_validator(mode="after")
    def require_passcode_for_protected(self) -> "ShareLinkCreate":
        if self.visibility == "protected" and (
            self.passcode is None or not self.passcode.get_secret_value().isdigit()
        ):
            raise ValueError("protected links require a numeric passcode")
        if self.visibility != "protected" and self.passcode is not None:
            raise ValueError("passcode is only valid for protected links")
        return self

    @field_validator("expires_at")
    @classmethod
    def expiry_must_include_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("expires_at must include a timezone")
        return value


class ShareLinkPatch(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    expires_at: datetime | None = None
    disclosures: ShareDisclosures | None = None
    visibility: str | None = None
    passcode: SecretStr | None = Field(default=None, min_length=6, max_length=12)

    @field_validator("expires_at")
    @classmethod
    def expiry_must_include_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("expires_at must include a timezone")
        return value

    @model_validator(mode="after")
    def require_a_change(self) -> "ShareLinkPatch":
        if not self.model_fields_set:
            raise ValueError("At least one share-link field must be provided")
        if "visibility" in self.model_fields_set and self.visibility is None:
            raise ValueError("visibility cannot be null")
        return self

    @field_validator("visibility")
    @classmethod
    def visibility_is_supported(cls, value: str | None) -> str | None:
        if value is not None and value not in {"private", "protected", "unlisted"}:
            raise ValueError("visibility must be private, protected, or unlisted")
        return value


class ShareLinkRead(APIModel):
    id: UUID
    title: str | None = None
    public_url: str | None = None
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    disclosures: ShareDisclosures
    visibility: str = "unlisted"


class ShareLinkPage(APIModel):
    items: list[ShareLinkRead]
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    total: int = Field(ge=0)


class PublicWaterSourceRead(APIModel):
    source_type: str
    label: str | None = None
    depth_ft: Decimal | None = None
    diameter_ft: Decimal | None = None
    yield_inches: Decimal | None = None
    seasonality: str | None = None
    details: str | None = None


class PublicUtilityRead(APIModel):
    utility_type: str
    available: bool
    details: str | None = None


class PublicSpecificationsRead(APIModel):
    category: str | None = None
    area: Decimal | None = None
    area_unit: str | None = None
    soil_type: str | None = None
    soil_type_other: str | None = None
    water_tds_ppm: int | None = None
    agronomist_notes: str | None = None
    water_sources: list[PublicWaterSourceRead] = Field(default_factory=list)
    utilities: list[PublicUtilityRead] = Field(default_factory=list)


class PublicDocumentRead(APIModel):
    url: str
    name: str
    category: str


class PublicBrokerContactRead(APIModel):
    business_name: str | None = None
    public_phone: str | None = None
    public_email: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None


class PublicListingRead(APIModel):
    title: str | None = None
    description: str | None = None
    specifications: PublicSpecificationsRead | None = None
    asking_price_inr: int | None = None
    approximate_location: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    road_access_type: str | None = None
    road_width_ft: Decimal | None = None
    media: list[dict[str, str]] = Field(default_factory=list)
    reports: list[dict[str, str]] = Field(default_factory=list)
    documents: list[PublicDocumentRead] = Field(default_factory=list)
    broker_contact: PublicBrokerContactRead | None = None


class ProfileShareLinkCreate(APIModel):
    title: str = Field(min_length=1, max_length=200)
    include_profile: bool = True
    include_properties: bool = True
    property_ids: list[UUID] | None = Field(default=None, min_length=2)
    property_disclosures: dict[UUID, ShareDisclosures] = Field(default_factory=dict)
    visibility: str = "unlisted"
    passcode: SecretStr | None = Field(default=None, min_length=6, max_length=12)
    expires_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def title_is_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title cannot be blank")
        return value.strip()

    @field_validator("visibility")
    @classmethod
    def profile_visibility_is_supported(cls, value: str) -> str:
        if value not in {"protected", "unlisted"}:
            raise ValueError("visibility must be protected or unlisted")
        return value

    @model_validator(mode="after")
    def validate_content_and_passcode(self) -> "ProfileShareLinkCreate":
        if not self.include_profile and not self.include_properties:
            raise ValueError("Select profile details, properties, or both")
        if self.property_ids is not None and len(set(self.property_ids)) != len(self.property_ids):
            raise ValueError("property_ids must not contain duplicates")
        if self.visibility == "protected" and (
            self.passcode is None or not self.passcode.get_secret_value().isdigit()
        ):
            raise ValueError("protected links require a numeric passcode")
        if self.visibility != "protected" and self.passcode is not None:
            raise ValueError("passcode is only valid for protected links")
        if self.expires_at is not None:
            if self.expires_at.utcoffset() is None:
                raise ValueError("expires_at must include a timezone")
            if self.expires_at <= datetime.now(UTC):
                raise ValueError("expires_at must be in the future")
        return self


class ProfileShareLinkPatch(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    include_profile: bool | None = None
    include_properties: bool | None = None
    property_ids: list[UUID] | None = Field(default=None, min_length=2)
    property_disclosures: dict[UUID, ShareDisclosures] | None = None
    visibility: str | None = None
    passcode: SecretStr | None = Field(default=None, min_length=6, max_length=12)
    expires_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def title_is_not_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("title cannot be blank")
        return value.strip() if value is not None else None

    @field_validator("visibility")
    @classmethod
    def profile_visibility_is_supported(cls, value: str | None) -> str | None:
        if value is not None and value not in {"protected", "unlisted"}:
            raise ValueError("visibility must be protected or unlisted")
        return value

    @field_validator("passcode")
    @classmethod
    def passcode_is_numeric(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None and not value.get_secret_value().isdigit():
            raise ValueError("passcode must be numeric")
        return value

    @field_validator("expires_at")
    @classmethod
    def expiry_must_be_future_and_timezone_aware(
        cls, value: datetime | None
    ) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("expires_at must include a timezone")
        if value is not None and value <= datetime.now(UTC):
            raise ValueError("expires_at must be in the future")
        return value

    @model_validator(mode="after")
    def patch_must_change_a_field(self) -> "ProfileShareLinkPatch":
        if not self.model_fields_set:
            raise ValueError("At least one profile share link field must be provided")
        if self.property_ids is not None and len(set(self.property_ids)) != len(self.property_ids):
            raise ValueError("property_ids must not contain duplicates")
        return self


class ProfileShareLinkRead(APIModel):
    id: UUID
    title: str
    include_profile: bool
    include_properties: bool
    property_ids: list[UUID] | None = None
    property_disclosures: dict[str, ShareDisclosures] = Field(default_factory=dict)
    visibility: str
    public_url: str | None = None
    expires_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime


class ProfileShareLinkPage(APIModel):
    items: list[ProfileShareLinkRead]
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    total: int = Field(ge=0)


class PublicProfilePropertyRead(APIModel):
    public_listing_token: str
    title: str
    description: str | None = None
    category: str
    asking_price_inr: int | None = None
    area: Decimal | None = None
    area_unit: str | None = None
    approximate_location: str | None = None


class PublicBrokerProfileRead(APIModel):
    business_name: str | None = None
    professional_title: str | None = None
    public_phone: str | None = None
    public_email: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None


class PublicProfileShareRead(APIModel):
    profile: PublicBrokerProfileRead | None = None
    properties: list[PublicProfilePropertyRead] | None = None
