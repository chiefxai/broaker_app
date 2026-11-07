"""Amazon Cognito access-token verifier."""

from typing import Any

import aioboto3

from app.auth.providers.jwks import JwksTokenVerifier


async def get_cognito_email(access_token: str, region: str) -> str | None:
    """Fetch a verified email on first-use provisioning when Cognito omits it from claims."""
    async with aioboto3.Session().client("cognito-idp", region_name=region) as client:
        result = await client.get_user(AccessToken=access_token)
    attributes = {item["Name"]: item["Value"] for item in result.get("UserAttributes", [])}
    email = attributes.get("email")
    verified = attributes.get("email_verified", "").lower() == "true"
    return email if verified and isinstance(email, str) and email else None


class CognitoAuthProvider(JwksTokenVerifier):
    def __init__(self, issuer: str, jwks_url: str, app_client_id: str) -> None:
        super().__init__(issuer, jwks_url)
        self.app_client_id = app_client_id

    async def verify(self, token: str) -> dict[str, Any]:
        if not self.issuer or not self.app_client_id:
            raise RuntimeError("Cognito configuration is missing")
        claims = await self.decode(token)
        if claims.get("token_use") != "access":
            raise ValueError("A Cognito access token is required")
        if claims.get("client_id") != self.app_client_id:
            raise ValueError("Token was issued to a different Cognito app client")
        return claims
