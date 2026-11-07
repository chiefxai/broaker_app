"""Public authentication request and response schemas."""

from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class RegistrationRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone_number: str = Field(min_length=7, max_length=32)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("full_name")
    @classmethod
    def trim_full_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Full name must contain at least two characters")
        return value

    @field_validator("phone_number")
    @classmethod
    def trim_phone_number(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Phone number is required")
        return value


class RegistrationResponse(BaseModel):
    message: str
    confirmation_required: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
