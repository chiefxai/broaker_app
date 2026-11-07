from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import APIModel


class SigningAuthorityInput(APIModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    relationship: str = Field(min_length=1, max_length=120)
    record_label: str | None = Field(default=None, max_length=120)
    record_value: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def normalize_required_fields(self) -> "SigningAuthorityInput":
        self.name = self.name.strip()
        self.relationship = self.relationship.strip()
        if not self.name or not self.relationship:
            raise ValueError("name and relationship must not be blank")
        if self.phone is not None:
            self.phone = self.phone.strip() or None
        if self.record_label is not None:
            self.record_label = self.record_label.strip() or None
        if self.record_value is not None:
            self.record_value = self.record_value.strip() or None
        return self


class SigningAuthoritiesUpdate(APIModel):
    items: list[SigningAuthorityInput] = Field(max_length=6)


class SigningAuthorityRead(APIModel):
    id: UUID
    name: str
    phone: str | None
    relationship: str
    record_label: str | None
    record_value: str | None
    verification_status: Literal["pending"] = "pending"
    signature_status: Literal["pending"] = "pending"
    created_at: datetime
    updated_at: datetime


class SigningAuthoritiesRead(APIModel):
    items: list[SigningAuthorityRead]
