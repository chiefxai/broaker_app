"""First-party access-token provider for local email/password testing."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt import InvalidTokenError


class PasswordAuthProvider:
    """Signs and verifies short-lived API access tokens for local accounts."""

    def __init__(self, signing_secret: str, issuer: str, access_token_ttl_seconds: int) -> None:
        self.signing_secret = signing_secret
        self.issuer = issuer.rstrip("/")
        self.access_token_ttl_seconds = access_token_ttl_seconds

    def issue_access_token(self, subject: str, email: str) -> str:
        self._require_configuration()
        now = datetime.now(UTC)
        return jwt.encode(
            {
                "iss": self.issuer,
                "aud": "broaker-api",
                "sub": subject,
                "email": email,
                "username": email,
                "scope": "broker",
                "iat": now,
                "exp": now + timedelta(seconds=self.access_token_ttl_seconds),
            },
            self.signing_secret,
            algorithm="HS256",
        )

    async def verify(self, token: str) -> dict[str, Any]:
        self._require_configuration()
        try:
            return jwt.decode(
                token,
                self.signing_secret,
                algorithms=["HS256"],
                issuer=self.issuer,
                audience="broaker-api",
            )
        except InvalidTokenError as exc:
            raise ValueError("Invalid or expired password access token") from exc

    def _require_configuration(self) -> None:
        if len(self.signing_secret.encode("utf-8")) < 32 or not self.issuer:
            raise RuntimeError("Password authentication secret is not configured")
