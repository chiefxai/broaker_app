"""Keycloak OIDC access-token verifier."""

from typing import Any

from app.auth.providers.jwks import JwksTokenVerifier


class KeycloakAuthProvider(JwksTokenVerifier):
    def __init__(self, issuer: str, jwks_url: str, client_id: str) -> None:
        super().__init__(issuer, jwks_url)
        self.client_id = client_id

    async def verify(self, token: str) -> dict[str, Any]:
        if not self.issuer or not self.jwks_url or not self.client_id:
            raise RuntimeError("Keycloak configuration is missing")
        claims = await self.decode(token)
        audience = claims.get("aud", [])
        if isinstance(audience, str):
            audience = [audience]
        elif not isinstance(audience, list):
            audience = []
        if claims.get("azp") != self.client_id and self.client_id not in audience:
            raise ValueError("Token was issued to a different Keycloak client")
        return claims
