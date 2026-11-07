"""Shared OIDC RS256 signature verification using a provider JWKS endpoint."""

from time import monotonic
from typing import Any

import httpx
import jwt
from jwt import PyJWK


class JwksTokenVerifier:
    def __init__(self, issuer: str, jwks_url: str) -> None:
        self.issuer = issuer.rstrip("/")
        self.jwks_url = jwks_url
        self._jwks: dict[str, dict[str, Any]] = {}
        self._jwks_fetched_at = 0.0

    async def _refresh_jwks(self) -> None:
        if not self.issuer or not self.jwks_url:
            raise RuntimeError("Identity provider configuration is missing")
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            self._jwks = {
                key["kid"]: key for key in response.json().get("keys", []) if "kid" in key
            }
        self._jwks_fetched_at = monotonic()

    async def _get_jwk(self, kid: str) -> dict[str, Any]:
        if not self._jwks or monotonic() - self._jwks_fetched_at > 3600:
            await self._refresh_jwks()
        if kid not in self._jwks:
            await self._refresh_jwks()
        try:
            return self._jwks[kid]
        except KeyError as exc:
            raise ValueError("Signing key not found") from exc

    async def decode(self, token: str) -> dict[str, Any]:
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise ValueError("Unsupported token signing algorithm")
        jwk = await self._get_jwk(header["kid"])
        key = PyJWK.from_dict(jwk, algorithm="RS256").key
        return jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            issuer=self.issuer,
            options={"verify_aud": False},
        )
