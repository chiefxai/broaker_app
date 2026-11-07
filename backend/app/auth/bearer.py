"""FastAPI bearer-token dependency shared by all identity providers."""

from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.providers.factory import provider_from_settings
from app.core.config import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = await provider_from_settings(settings).verify(credentials.credentials)
        if "username" not in claims and isinstance(claims.get("preferred_username"), str):
            claims["username"] = claims["preferred_username"]
        return claims
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Authentication is not configured") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503, detail="Unable to reach identity provider JWKS"
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
