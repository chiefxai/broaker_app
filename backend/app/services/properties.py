"""Shared property ownership and response serialization helpers."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Property, PropertyCategory


async def owned_property(session: AsyncSession, property_id: UUID, owner_id: UUID) -> Property:
    result = await session.execute(
        select(Property).where(Property.id == property_id, Property.owner_user_id == owner_id)
    )
    prop = result.scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


async def category_for_code(session: AsyncSession, code: str) -> PropertyCategory:
    result = await session.execute(select(PropertyCategory).where(PropertyCategory.code == code))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=422, detail="Unknown property category")
    return category


async def property_summary(session: AsyncSession, prop: Property) -> dict:
    category = await session.get(PropertyCategory, prop.primary_category_id)
    from app.models import (
        PropertyFeatures,
        PropertyFinancials,
        PropertyLegalDetails,
        PropertyLocation,
    )

    sections = (PropertyLocation, PropertyFeatures, PropertyFinancials, PropertyLegalDetails)
    complete = 0
    for model in sections:
        if await session.get(model, prop.id) is not None:
            complete += 1
    return {
        "id": prop.id,
        "title": prop.title,
        "category": category.code if category else "unknown",
        "status": prop.status,
        "completion_percent": complete * 25,
        "created_at": prop.created_at,
        "updated_at": prop.updated_at,
    }


async def property_detail(session: AsyncSession, prop: Property) -> dict:
    from app.models import (
        PropertyFeatures,
        PropertyFinancials,
        PropertyLegalDetails,
        PropertyLocation,
        PropertyUtility,
        PropertyWaterSource,
    )

    result = await property_summary(session, prop)
    location = await session.get(PropertyLocation, prop.id)
    financials = await session.get(PropertyFinancials, prop.id)
    legal = await session.get(PropertyLegalDetails, prop.id)
    features = await session.get(PropertyFeatures, prop.id)
    water_sources = (
        (
            await session.execute(
                select(PropertyWaterSource).where(PropertyWaterSource.property_id == prop.id)
            )
        )
        .scalars()
        .all()
    )
    utilities = (
        (
            await session.execute(
                select(PropertyUtility).where(PropertyUtility.property_id == prop.id)
            )
        )
        .scalars()
        .all()
    )
    result.update(
        {
            "description": prop.description,
            "location": location,
            "financials": financials,
            "legal": legal,
            "features": (
                {
                    "soil_type": features.soil_type,
                    "soil_type_other": features.soil_type_other,
                    "water_tds_ppm": features.water_tds_ppm,
                    "agronomist_notes": features.agronomist_notes,
                    "water_sources": water_sources,
                    "utilities": utilities,
                }
                if features
                else None
            ),
        }
    )
    return result
