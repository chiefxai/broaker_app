"""Local password account operations. Enabled only for local/development environments."""

import asyncio
import base64
import hmac
import os
from functools import lru_cache
from uuid import uuid4

from cryptography.hazmat.primitives.kdf.argon2 import Argon2id
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.providers.password import PasswordAuthProvider
from app.models import BrokerProfile, PasswordCredential, User
from app.schemas.auth import LoginRequest, RegistrationRequest

_ARGON2_MEMORY_COST_KIB = 64 * 1024
_ARGON2_ITERATIONS = 3
_ARGON2_LANES = 4
_ARGON2_OUTPUT_BYTES = 32


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = Argon2id(
        salt=salt,
        length=_ARGON2_OUTPUT_BYTES,
        iterations=_ARGON2_ITERATIONS,
        lanes=_ARGON2_LANES,
        memory_cost=_ARGON2_MEMORY_COST_KIB,
    ).derive(password.encode("utf-8"))
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii")
    digest_text = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"argon2id${salt_text}${digest_text}"


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, salt_text, digest_text = encoded_hash.split("$", maxsplit=2)
        if algorithm != "argon2id":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected_digest = base64.urlsafe_b64decode(digest_text.encode("ascii"))
        actual_digest = Argon2id(
            salt=salt,
            length=len(expected_digest),
            iterations=_ARGON2_ITERATIONS,
            lanes=_ARGON2_LANES,
            memory_cost=_ARGON2_MEMORY_COST_KIB,
        ).derive(password.encode("utf-8"))
        return hmac.compare_digest(actual_digest, expected_digest)
    except (ValueError, TypeError):
        return False


@lru_cache(maxsize=1)
def _dummy_password_hash() -> str:
    return hash_password("nonexistent-account-timing-probe")


async def register_password_account(
    session: AsyncSession,
    payload: RegistrationRequest,
    token_provider: PasswordAuthProvider,
) -> tuple[User, str]:
    email = str(payload.email).strip().lower()
    existing = await session.execute(
        select(User.id).where(func.lower(User.account_email) == email)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_id = uuid4()
    user = User(
        id=user_id,
        identity_sub=f"password:{user_id}",
        account_email=email,
    )
    credential = PasswordCredential(
        user_id=user_id,
        email=email,
        password_hash=await asyncio.to_thread(hash_password, payload.password.get_secret_value()),
    )
    session.add(user)
    try:
        await session.flush()
        session.add(credential)
        await session.flush()
        session.add(BrokerProfile(
            user_id=user_id,
            legal_name=payload.full_name,
            mobile_phone=payload.phone_number,
        ))
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        if getattr(exc.orig, "sqlstate", None) != "23505":
            raise
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        ) from exc
    return user, token_provider.issue_access_token(user.identity_sub, email)


async def authenticate_password(
    session: AsyncSession,
    payload: LoginRequest,
    token_provider: PasswordAuthProvider,
) -> tuple[User, str]:
    email = str(payload.email).strip().lower()
    result = await session.execute(
        select(User, PasswordCredential)
        .join(PasswordCredential, PasswordCredential.user_id == User.id)
        .where(func.lower(PasswordCredential.email) == email)
    )
    row = result.one_or_none()
    user, credential = row if row is not None else (None, None)
    if credential and user and user.is_active:
        hash_to_check = credential.password_hash
    else:
        hash_to_check = await asyncio.to_thread(_dummy_password_hash)
    password_valid = await asyncio.to_thread(
        verify_password,
        payload.password.get_secret_value(),
        hash_to_check,
    )
    if user is None or credential is None or not user.is_active or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user, token_provider.issue_access_token(user.identity_sub, credential.email)
