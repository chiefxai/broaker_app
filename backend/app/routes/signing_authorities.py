"""Property-scoped signing-authority records."""

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import delete, select

from app.auth.dependencies import AccountUser, DatabaseSession
from app.models import PropertySigningAuthority
from app.schemas.signing_authorities import (
    SigningAuthoritiesRead,
    SigningAuthoritiesUpdate,
)
from app.services.properties import owned_property

router = APIRouter(prefix="/properties", tags=["signing authorities"])


@router.get("/{property_id}/signing-authorities", response_model=SigningAuthoritiesRead)
async def get_signing_authorities(
    property_id: UUID, account: AccountUser, session: DatabaseSession
) -> dict:
    await owned_property(session, property_id, account.id)
    rows = await session.execute(
        select(PropertySigningAuthority)
        .where(PropertySigningAuthority.property_id == property_id)
        .order_by(PropertySigningAuthority.created_at, PropertySigningAuthority.id)
    )
    return {"items": rows.scalars().all()}


@router.put("/{property_id}/signing-authorities", response_model=SigningAuthoritiesRead)
async def replace_signing_authorities(
    property_id: UUID,
    payload: SigningAuthoritiesUpdate,
    account: AccountUser,
    session: DatabaseSession,
) -> dict:
    await owned_property(session, property_id, account.id)
    await session.execute(
        delete(PropertySigningAuthority).where(
            PropertySigningAuthority.property_id == property_id
        )
    )
    rows = [
        PropertySigningAuthority(property_id=property_id, **item.model_dump())
        for item in payload.items
    ]
    session.add_all(rows)
    await session.flush()
    for row in rows:
        await session.refresh(row)
    return {"items": rows}
