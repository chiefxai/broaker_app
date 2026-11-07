"""Authentication and current-user routes."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import CurrentUser, DatabaseSession
from app.auth.providers.factory import provider_from_settings
from app.auth.providers.password import PasswordAuthProvider
from app.core.config import Settings, get_settings
from app.schemas import CurrentUserRead
from app.schemas.auth import AuthTokenResponse, LoginRequest, RegistrationRequest
from app.services.password_auth import authenticate_password, register_password_account

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUserRead)
async def read_current_user(user: CurrentUser) -> dict[str, Any]:
    return {
        "sub": user["sub"],
        "username": user.get("username"),
        "scope": user.get("scope", ""),
    }


def _password_provider(settings: Settings) -> PasswordAuthProvider:
    if settings.auth_provider != "password" or settings.environment.lower() not in {
        "local", "development", "dev", "test"
    }:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local password authentication is disabled in this environment.",
        )
    if len(settings.password_auth_secret.get_secret_value().encode("utf-8")) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local password authentication is not configured.",
        )
    provider = provider_from_settings(settings)
    if not isinstance(provider, PasswordAuthProvider):
        raise HTTPException(status_code=503, detail="Local password authentication is unavailable.")
    return provider


def _token_response(token: str, settings: Settings) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.password_access_token_ttl_seconds,
    )


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "An account with this email already exists"},
        503: {"description": "Local password authentication is unavailable"},
    },
)
async def register(
    payload: RegistrationRequest,
    session: DatabaseSession,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthTokenResponse:
    """Create a local password account and return its short-lived access token."""
    provider = _password_provider(settings)
    _, token = await register_password_account(session, payload, provider)
    return _token_response(token, settings)


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    responses={
        401: {"description": "Email or password is incorrect"},
        503: {"description": "Local password authentication is unavailable"},
    },
)
async def login(
    payload: LoginRequest,
    session: DatabaseSession,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthTokenResponse:
    """Authenticate a local account without sending credentials to an identity provider."""
    provider = _password_provider(settings)
    _, token = await authenticate_password(session, payload, provider)
    return _token_response(token, settings)
