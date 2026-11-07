"""Property list, draft management, and wizard section routes."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select

from app.auth.dependencies import AccountUser, DatabaseSession
from app.models import (
    Property,
    PropertyFeatures,
    PropertyFinancials,
    PropertyLegalDetails,
    PropertyLocation,
    PropertyNote,
    PropertyUtility,
    PropertyWaterSource,
)
from app.schemas.properties import (
    PropertyCreate,
    PropertyDetail,
    PropertyFeaturesUpdate,
    PropertyFinancialsUpdate,
    PropertyLegalDetailsUpdate,
    PropertyLocationUpdate,
    PropertyNoteUpdate,
    PropertyPage,
    PropertyPatch,
    PropertySummary,
)
from app.services.properties import (
    category_for_code,
    owned_property,
    property_detail,
    property_summary,
)

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=PropertyPage)
async def list_properties(
    account: AccountUser,
    session: DatabaseSession,
    q: str | None = None,
    category: str | None = None,
    property_status: Literal["draft", "active", "archived"] | None = Query(
        default=None, alias="status"
    ),
    district: str | None = None,
    price_min: int | None = Query(default=None, ge=0),
    price_max: int | None = Query(default=None, ge=0),
    area_min: float | None = Query(default=None, gt=0),
    area_max: float | None = Query(default=None, gt=0),
    area_unit: str | None = None,
    sort: Literal["updated_desc", "updated_asc", "price_asc", "price_desc"] = "updated_desc",
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> PropertyPage:
    query = select(Property).where(Property.owner_user_id == account.id)
    if property_status:
        query = query.where(Property.status == property_status)
    if category:
        category_row = await category_for_code(session, category)
        query = query.where(Property.primary_category_id == category_row.id)
    if district or q:
        query = query.outerjoin(PropertyLocation, PropertyLocation.property_id == Property.id)
    if (
        price_min is not None
        or price_max is not None
        or area_min is not None
        or area_max is not None
        or area_unit
        or sort in {"price_asc", "price_desc"}
    ):
        query = query.join(PropertyFinancials, PropertyFinancials.property_id == Property.id)
    if price_min is not None:
        query = query.where(PropertyFinancials.asking_price_inr >= price_min)
    if price_max is not None:
        query = query.where(PropertyFinancials.asking_price_inr <= price_max)
    if area_min is not None:
        query = query.where(PropertyFinancials.area >= area_min)
    if area_max is not None:
        query = query.where(PropertyFinancials.area <= area_max)
    if area_unit:
        query = query.where(PropertyFinancials.area_unit == area_unit)
    if district:
        query = query.where(PropertyLocation.district.ilike(f"%{district}%"))
    if q:
        query = query.where(
            or_(
                Property.title.ilike(f"%{q}%"),
                Property.description.ilike(f"%{q}%"),
                PropertyLocation.district.ilike(f"%{q}%"),
            )
        )
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = (await session.execute(count_query)).scalar_one()
    rows = (
        (
            await session.execute(
                query.order_by(
                    PropertyFinancials.asking_price_inr.asc()
                    if sort == "price_asc"
                    else PropertyFinancials.asking_price_inr.desc()
                    if sort == "price_desc"
                    else Property.updated_at.asc()
                    if sort == "updated_asc"
                    else Property.updated_at.desc()
                )
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .unique()
        .all()
    )
    return PropertyPage(
        items=[await property_summary(session, row) for row in rows],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post("", response_model=PropertySummary, status_code=status.HTTP_201_CREATED)
async def create_property(
    payload: PropertyCreate, account: AccountUser, session: DatabaseSession
) -> dict:
    category = await category_for_code(session, payload.category)
    prop = Property(owner_user_id=account.id, title=payload.title, primary_category_id=category.id)
    session.add(prop)
    await session.flush()
    await session.refresh(prop)
    return await property_summary(session, prop)


@router.get("/{property_id}", response_model=PropertyDetail)
async def get_property(property_id: UUID, account: AccountUser, session: DatabaseSession) -> dict:
    return await property_detail(session, await owned_property(session, property_id, account.id))


@router.patch("/{property_id}", response_model=PropertySummary)
async def patch_property(
    property_id: UUID, payload: PropertyPatch, account: AccountUser, session: DatabaseSession
) -> dict:
    prop = await owned_property(session, property_id, account.id)
    changes = payload.model_dump(exclude_unset=True)
    if "category" in changes:
        category = await category_for_code(session, changes.pop("category"))
        prop.primary_category_id = category.id
    for key, value in changes.items():
        setattr(prop, key, value)
    await session.flush()
    await session.refresh(prop)
    return await property_summary(session, prop)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: UUID, account: AccountUser, session: DatabaseSession
) -> Response:
    prop = await owned_property(session, property_id, account.id)
    if prop.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft properties can be deleted")
    await session.delete(prop)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{property_id}/publish", response_model=PropertySummary)
async def publish_property(
    property_id: UUID, account: AccountUser, session: DatabaseSession
) -> dict:
    prop = await owned_property(session, property_id, account.id)
    if prop.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft properties can be published")
    if not await session.get(PropertyLocation, prop.id) or not await session.get(
        PropertyFinancials, prop.id
    ):
        raise HTTPException(
            status_code=409, detail="Location and financials are required to publish"
        )
    prop.status, prop.published_at = "active", datetime.now(UTC)
    await session.flush()
    await session.refresh(prop)
    return await property_summary(session, prop)


@router.post("/{property_id}/archive", response_model=PropertySummary)
async def archive_property(
    property_id: UUID, account: AccountUser, session: DatabaseSession
) -> dict:
    prop = await owned_property(session, property_id, account.id)
    if prop.status == "draft":
        raise HTTPException(
            status_code=409, detail="Delete an unpublished draft instead of archiving it"
        )
    prop.status, prop.archived_at = "archived", datetime.now(UTC)
    await session.flush()
    await session.refresh(prop)
    return await property_summary(session, prop)


async def replace_section(
    session: DatabaseSession, model: type, property_id: UUID, values: dict
) -> object:
    row = await session.get(model, property_id)
    if row is None:
        row = model(property_id=property_id)
        session.add(row)
    for key, value in values.items():
        if key in {"water_sources", "utilities"}:
            continue
        setattr(row, key, value)
    await session.flush()
    await session.refresh(row)
    return row


@router.put("/{property_id}/location", response_model=PropertyLocationUpdate)
async def put_location(
    property_id: UUID,
    payload: PropertyLocationUpdate,
    account: AccountUser,
    session: DatabaseSession,
) -> object:
    await owned_property(session, property_id, account.id)
    return await replace_section(session, PropertyLocation, property_id, payload.model_dump())


@router.put("/{property_id}/features", response_model=PropertyFeaturesUpdate)
async def put_features(
    property_id: UUID,
    payload: PropertyFeaturesUpdate,
    account: AccountUser,
    session: DatabaseSession,
) -> dict:
    await owned_property(session, property_id, account.id)
    row = await replace_section(
        session,
        PropertyFeatures,
        property_id,
        payload.model_dump(exclude={"water_sources", "utilities"}),
    )
    for model in (PropertyWaterSource, PropertyUtility):
        for existing in (
            await session.execute(select(model).where(model.property_id == property_id))
        ).scalars():
            await session.delete(existing)
    await session.flush()
    for source in payload.water_sources:
        session.add(PropertyWaterSource(property_id=property_id, **source.model_dump()))
    for utility in payload.utilities:
        session.add(PropertyUtility(property_id=property_id, **utility.model_dump()))
    return {
        **{
            k: getattr(row, k)
            for k in PropertyFeaturesUpdate.model_fields
            if k not in {"water_sources", "utilities"}
        },
        "water_sources": payload.water_sources,
        "utilities": payload.utilities,
    }


@router.put("/{property_id}/financials", response_model=PropertyFinancialsUpdate)
async def put_financials(
    property_id: UUID,
    payload: PropertyFinancialsUpdate,
    account: AccountUser,
    session: DatabaseSession,
) -> object:
    await owned_property(session, property_id, account.id)
    return await replace_section(session, PropertyFinancials, property_id, payload.model_dump())


@router.put("/{property_id}/legal", response_model=PropertyLegalDetailsUpdate)
async def put_legal(
    property_id: UUID,
    payload: PropertyLegalDetailsUpdate,
    account: AccountUser,
    session: DatabaseSession,
) -> object:
    await owned_property(session, property_id, account.id)
    return await replace_section(session, PropertyLegalDetails, property_id, payload.model_dump())


@router.get("/{property_id}/notes")
async def get_notes(
    property_id: UUID, account: AccountUser, session: DatabaseSession
) -> dict[str, str | None]:
    await owned_property(session, property_id, account.id)
    row = await session.get(PropertyNote, property_id)
    return {"notes": row.body if row else None}


@router.put("/{property_id}/notes")
async def put_notes(
    property_id: UUID, payload: PropertyNoteUpdate, account: AccountUser, session: DatabaseSession
) -> dict[str, str | None]:
    await owned_property(session, property_id, account.id)
    row = await session.get(PropertyNote, property_id)
    if row is None:
        row = PropertyNote(property_id=property_id, body=payload.notes or "")
        session.add(row)
    else:
        row.body = payload.notes or ""
    await session.flush()
    return {"notes": row.body}
