from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Broaker API"
    environment: str = "local"
    debug: bool = False
    auto_create_tables: bool = False
    auth_provider: Literal["password", "cognito", "keycloak"] = "password"
    api_v1_prefix: str = "/api/v1"
    cors_allowed_origins: str = (
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    database_url: str = "postgresql+asyncpg://broaker:broaker-dev-password@localhost:5432/broaker"
    redis_url: str = "redis://localhost:6379/0"
    cognito_region: str = ""
    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""
    keycloak_issuer: str = ""
    keycloak_jwks_endpoint: str = Field(default="", validation_alias="KEYCLOAK_JWKS_URL")
    keycloak_client_id: str = "broaker-api"
    keycloak_registration_client_id: str = ""
    keycloak_registration_client_secret: str = ""
    keycloak_admin_base_url: str = ""
    password_auth_secret: SecretStr = SecretStr("")
    share_link_encryption_key: SecretStr = SecretStr("")
    password_access_token_ttl_seconds: int = 28_800
    s3_endpoint_url: str = ""
    s3_public_endpoint_url: str = ""
    s3_region: str = "us-east-1"
    s3_bucket_name: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_addressing_style: str = "path"
    s3_presigned_url_expires_seconds: int = 600
    s3_max_upload_bytes: int = 26_214_400
    public_api_base_url: str = "http://localhost:8000"

    @field_validator("database_url")
    @classmethod
    def require_async_postgres_driver(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use PostgreSQL with the asyncpg driver")
        return value

    @field_validator("s3_presigned_url_expires_seconds")
    @classmethod
    def validate_presigned_url_expiry(cls, value: int) -> int:
        if not 1 <= value <= 604800:
            raise ValueError("S3 presigned URL expiry must be between 1 and 604800 seconds")
        return value

    @field_validator("s3_max_upload_bytes")
    @classmethod
    def validate_s3_max_upload_bytes(cls, value: int) -> int:
        if not 1 <= value <= 104_857_600:
            raise ValueError("S3_MAX_UPLOAD_BYTES must be between 1 and 104857600")
        return value

    @model_validator(mode="after")
    def apply_local_s3_defaults(self) -> "Settings":
        """Make the documented local MinIO setup work without production fallbacks."""
        if self.environment.lower() in {"local", "development", "dev", "test"}:
            self.s3_endpoint_url = self.s3_endpoint_url or "http://localhost:9000"
            self.s3_public_endpoint_url = (
                self.s3_public_endpoint_url or self.s3_endpoint_url
            )
            self.s3_bucket_name = self.s3_bucket_name or "broaker-documents"
            self.s3_access_key_id = self.s3_access_key_id or "broaker-minio"
            self.s3_secret_access_key = (
                self.s3_secret_access_key or "local-minio-password"
            )
        return self

    @field_validator("password_access_token_ttl_seconds")
    @classmethod
    def validate_password_token_expiry(cls, value: int) -> int:
        if not 300 <= value <= 86_400:
            raise ValueError("Password access token expiry must be between 300 and 86400 seconds")
        return value

    @field_validator("auth_provider", mode="before")
    @classmethod
    def normalize_auth_provider(cls, value: str) -> str:
        return value.lower() if isinstance(value, str) else value

    @property
    def cognito_issuer(self) -> str:
        if not self.cognito_region or not self.cognito_user_pool_id:
            return ""
        return (
            f"https://cognito-idp.{self.cognito_region}.amazonaws.com/{self.cognito_user_pool_id}"
        )

    @property
    def cognito_jwks_url(self) -> str:
        issuer = self.cognito_issuer
        return f"{issuer}/.well-known/jwks.json" if issuer else ""

    @property
    def keycloak_jwks_url(self) -> str:
        if self.keycloak_jwks_endpoint:
            return self.keycloak_jwks_endpoint
        issuer = self.keycloak_issuer.rstrip("/")
        return f"{issuer}/protocol/openid-connect/certs" if issuer else ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
