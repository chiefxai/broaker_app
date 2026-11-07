"""Authentication dependencies for protected API routes."""

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.bearer import bearer_scheme, get_current_user
from app.auth.providers.cognito import get_cognito_email
from app.config.database import get_db_session
from app.core.config import Settings, get_settings
from app.models import User

CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_account_user(
    user: CurrentUser,
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    """Resolve the provider subject to its private application account."""
    return await account_for_verified_user(user, session, credentials, settings)


async def get_optional_account_user(
    request: Request,
    session: DatabaseSession,
    settings: Annotated[Settings, Depends(get_settings)],
) -> User | None:
    """Resolve an optional access token for routes that are public except for owner-only data."""
    authorization = request.headers.get("Authorization")
    if authorization is None:
        return None
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token.strip())
    user = await get_current_user(credentials, settings)
    return await account_for_verified_user(user, session, credentials, settings)


async def account_for_verified_user(
    user: dict[str, Any],
    session: AsyncSession,
    credentials: HTTPAuthorizationCredentials | None,
    settings: Settings,
) -> User:
    result = await session.execute(select(User).where(User.identity_sub == user["sub"]))
    account = result.scalar_one_or_none()
    if account is None:
        email = user.get("email")
        verified = user.get("email_verified") in (True, "true")
        if settings.auth_provider == "cognito" and (
            not isinstance(email, str) or not email or not verified
        ):
            try:
                if credentials is not None:
                    email = await get_cognito_email(
                        credentials.credentials, settings.cognito_region
                    )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to load identity provider account attributes",
                ) from exc
        if not isinstance(email, str) or not email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The authenticated identity must include an email before using the API",
            )
        await session.execute(
            pg_insert(User)
            .values(identity_sub=user["sub"], account_email=email)
            .on_conflict_do_nothing(index_elements=[User.identity_sub])
        )
        result = await session.execute(select(User).where(User.identity_sub == user["sub"]))
        account = result.scalar_one()
    if not account.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    return account


AccountUser = Annotated[User, Depends(get_account_user)]
OptionalAccountUser = Annotated[User | None, Depends(get_optional_account_user)]
