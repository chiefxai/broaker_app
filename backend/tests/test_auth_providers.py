from datetime import UTC, datetime, timedelta
from time import monotonic

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.auth.providers.cognito import CognitoAuthProvider
from app.auth.providers.factory import get_auth_provider
from app.auth.providers.keycloak import KeycloakAuthProvider
from app.auth.providers.password import PasswordAuthProvider
from app.core.config import Settings


@pytest.fixture
def signing_key():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    public_jwk["kid"] = "local-test-key"
    return private_key, public_jwk


def make_token(private_key, claims: dict) -> str:
    claims = {
        "iss": "http://issuer.test/realm",
        "sub": "broker-subject",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(minutes=5),
        **claims,
    }
    return jwt.encode(
        claims,
        private_key,
        algorithm="RS256",
        headers={"kid": "local-test-key"},
    )


@pytest.mark.asyncio
async def test_keycloak_provider_validates_signature_issuer_and_client(signing_key) -> None:
    private_key, jwk = signing_key
    provider = KeycloakAuthProvider(
        "http://issuer.test/realm", "https://issuer.test/certs", "broaker-api"
    )
    provider._jwks = {"local-test-key": jwk}
    provider._jwks_fetched_at = monotonic()
    token = make_token(private_key, {"azp": "broaker-api", "email": "broker@example.test"})

    claims = await provider.verify(token)

    assert claims["sub"] == "broker-subject"
    assert claims["email"] == "broker@example.test"


@pytest.mark.asyncio
async def test_keycloak_provider_rejects_tokens_for_another_client(signing_key) -> None:
    private_key, jwk = signing_key
    provider = KeycloakAuthProvider(
        "http://issuer.test/realm", "https://issuer.test/certs", "broaker-api"
    )
    provider._jwks = {"local-test-key": jwk}
    provider._jwks_fetched_at = monotonic()
    token = make_token(private_key, {"azp": "other-client"})

    with pytest.raises(ValueError, match="different Keycloak client"):
        await provider.verify(token)


@pytest.mark.asyncio
async def test_cognito_provider_keeps_cognito_access_token_claim_checks(signing_key) -> None:
    private_key, jwk = signing_key
    provider = CognitoAuthProvider(
        "http://issuer.test/realm", "https://issuer.test/certs", "app-id"
    )
    provider._jwks = {"local-test-key": jwk}
    provider._jwks_fetched_at = monotonic()
    token = make_token(private_key, {"token_use": "access", "client_id": "app-id"})

    assert (await provider.verify(token))["client_id"] == "app-id"


def test_provider_selection_defaults_to_password_and_keeps_oidc_adapters_available() -> None:
    assert Settings().auth_provider == "password"
    assert Settings(auth_provider="KEYCLOAK").auth_provider == "keycloak"
    get_auth_provider.cache_clear()
    assert isinstance(
        get_auth_provider("keycloak", "issuer", "jwks", "client"), KeycloakAuthProvider
    )


@pytest.mark.asyncio
async def test_password_provider_issues_and_verifies_scoped_access_token() -> None:
    provider = PasswordAuthProvider("test-signing-secret-longer-than-32-bytes", "broaker-api", 900)
    token = provider.issue_access_token("password:user-1", "broker@example.test")
    claims = await provider.verify(token)

    assert claims["sub"] == "password:user-1"
    assert claims["scope"] == "broker"
    assert claims["email"] == "broker@example.test"


@pytest.mark.asyncio
async def test_password_provider_rejects_another_signing_key() -> None:
    provider = PasswordAuthProvider("test-signing-secret-longer-than-32-bytes", "broaker-api", 900)
    token = provider.issue_access_token("password:user-1", "broker@example.test")
    other = PasswordAuthProvider("different-signing-secret-longer-than-32", "broaker-api", 900)

    with pytest.raises(ValueError, match="Invalid or expired"):
        await other.verify(token)
