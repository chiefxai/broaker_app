"""Account profile and onboarding services."""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_create(session: AsyncSession, model: type, user_id: UUID, **defaults: Any) -> Any:
    obj = await session.get(model, user_id)
    if obj is None:
        obj = model(user_id=user_id, **defaults)
        session.add(obj)
        await session.flush()
    return obj


async def patch_account_row(session: AsyncSession, obj: Any, changes: dict[str, Any]) -> Any:
    for field, value in changes.items():
        setattr(obj, field, value)
    await session.flush()
    await session.refresh(obj)
    return obj


async def profile_or_none(session: AsyncSession, model: type, user_id: UUID) -> Any | None:
    return await session.get(model, user_id)
