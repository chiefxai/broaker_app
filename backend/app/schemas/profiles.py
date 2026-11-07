from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import EmailStr, Field, model_validator

from app.schemas.common import APIModel
from app.schemas.sharing import ShareDisclosures


class BrokerProfileInput(APIModel):
    legal_name: str = Field(min_length=1, max_length=200)
    mobile_phone: str | None = Field(default=None, max_length=40)
    operating_language: str = Field(default="en", min_length=2, max_length=12)
    designation: str | None = Field(default=None, max_length=200)
    license_number: str | None = Field(default=None, max_length=100)
    license_jurisdiction: str | None = Field(default=None, max_length=100)


class BrokerProfilePatch(APIModel):
    legal_name: str | None = Field(default=None, min_length=1, max_length=200)
    mobile_phone: str | None = Field(default=None, max_length=40)
    operating_language: str | None = Field(default=None, min_length=2, max_length=12)
    designation: str | None = Field(default=None, max_length=200)
    license_number: str | None = Field(default=None, max_length=100)
    license_jurisdiction: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def require_a_change(self) -> "BrokerProfilePatch":
        if not self.model_fields_set:
            raise ValueError("At least one broker profile field must be provided")
        return self


class BrokerProfileRead(BrokerProfileInput):
    account_email: EmailStr
    created_at: datetime
    updated_at: datetime


class BusinessProfileInput(APIModel):
    business_name: str | None = Field(default=None, max_length=200)
    public_phone: str | None = Field(default=None, max_length=40)
    public_email: EmailStr | None = None
    city: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)


class BusinessProfilePatch(APIModel):
    business_name: str | None = Field(default=None, max_length=200)
    public_phone: str | None = Field(default=None, max_length=40)
    public_email: EmailStr | None = None
    city: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def require_a_change(self) -> "BusinessProfilePatch":
        if not self.model_fields_set:
            raise ValueError("At least one business profile field must be provided")
        return self


class BusinessProfileRead(BusinessProfileInput):
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class UserPreferencesPatch(APIModel):
    theme: Literal["light", "dark"] | None = None
    language: str | None = Field(default=None, min_length=2, max_length=12)
    default_disclosures: ShareDisclosures | None = None
    default_expiration_days: Literal[1, 7, 30, 90, 365] | None = None

    @model_validator(mode="after")
    def require_a_change(self) -> "UserPreferencesPatch":
        if not self.model_fields_set:
            raise ValueError("At least one preference must be provided")
        return self


class UserPreferencesRead(APIModel):
    theme: Literal["light", "dark"]
    language: str
    default_disclosures: ShareDisclosures
    default_expiration_days: Literal[1, 7, 30, 90, 365] | None = None


class OnboardingProgressPatch(APIModel):
    current_step: str | None = Field(default=None, max_length=80)
    completed_steps: list[str] | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def require_a_change(self) -> "OnboardingProgressPatch":
        if not self.model_fields_set:
            raise ValueError("At least one onboarding field must be provided")
        return self


class OnboardingProgressRead(APIModel):
    completed: bool
    current_step: str | None = None
    completed_steps: list[str]


class ProfileOwner(APIModel):
    user_id: UUID
