"""Provider-neutral authentication contract."""

from typing import Any, Protocol


class AuthProvider(Protocol):
    async def verify(self, token: str) -> dict[str, Any]:
        """Verify a bearer token and return its trusted claims."""
