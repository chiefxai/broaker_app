"""Authentication provider construction and caching."""

from functools import lru_cache

from app.auth.providers.base import AuthProvider
from app.auth.providers.cognito import CognitoAuthProvider
from app.auth.providers.keycloak import KeycloakAuthProvider
from app.auth.providers.password import PasswordAuthProvider
from app.core.config import Settings


@lru_cache
def get_auth_provider(
    provider: str,
    issuer: str,
    jwks_url: str,
    client_id: str,
    password_secret: str = "",
    password_token_ttl_seconds: int = 28_800,
) -> AuthProvider:
    if provider == "password":
        return PasswordAuthProvider(
            password_secret, issuer or "broaker-api", password_token_ttl_seconds
        )
    if provider == "cognito":
        return CognitoAuthProvider(issuer, jwks_url, client_id)
    if provider == "keycloak":
        return KeycloakAuthProvider(issuer, jwks_url, client_id)
    raise RuntimeError("AUTH_PROVIDER must be 'password', 'cognito', or 'keycloak'")


def provider_from_settings(settings: Settings) -> AuthProvider:
    if settings.auth_provider == "password":
        return get_auth_provider(
            "password",
            "broaker-api",
            "",
            "",
            settings.password_auth_secret.get_secret_value(),
            settings.password_access_token_ttl_seconds,
        )
    if settings.auth_provider == "cognito":
        return get_auth_provider(
            "cognito",
            settings.cognito_issuer,
            settings.cognito_jwks_url,
            settings.cognito_app_client_id,
        )
    return get_auth_provider(
        "keycloak",
        settings.keycloak_issuer,
        settings.keycloak_jwks_url,
        settings.keycloak_client_id,
    )
