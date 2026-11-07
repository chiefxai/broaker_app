"""Reference catalog endpoints."""

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.dependencies import AccountUser, DatabaseSession
from app.models import PropertyCategory, UserPropertyCategory
from app.schemas.properties import (
    PropertyCategoryRead,
    UserPropertyCategoriesUpdate,
)

router = APIRouter(tags=["reference"])


@router.get("/property-categories", response_model=list[PropertyCategoryRead])
async def list_property_categories(account: AccountUser, session: DatabaseSession) -> list[dict]:
    rows = (
        (await session.execute(select(PropertyCategory).order_by(PropertyCategory.sort_order)))
        .scalars()
        .all()
    )
    prefs = (
        (
            await session.execute(
                select(UserPropertyCategory).where(UserPropertyCategory.user_id == account.id)
            )
        )
        .scalars()
        .all()
    )
    pref_map = {pref.category_id: pref for pref in prefs}
    return [
        {
            "code": row.code,
            "label": row.label,
            "sort_order": pref_map[row.id].sort_order if row.id in pref_map else row.sort_order,
            "enabled": pref_map[row.id].enabled if row.id in pref_map else True,
        }
        for row in rows
    ]


@router.put("/profile/preferences/property-categories", response_model=list[PropertyCategoryRead])
async def replace_property_categories(
    payload: UserPropertyCategoriesUpdate, account: AccountUser, session: DatabaseSession
) -> list[dict]:
    category_rows = (await session.execute(select(PropertyCategory))).scalars().all()
    by_code = {row.code: row for row in category_rows}
    unknown = [item.code for item in payload.items if item.code not in by_code]
    if unknown:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422, detail=f"Unknown category code(s): {', '.join(unknown)}"
        )
    current = (
        (
            await session.execute(
                select(UserPropertyCategory).where(UserPropertyCategory.user_id == account.id)
            )
        )
        .scalars()
        .all()
    )
    for row in current:
        await session.delete(row)
    for item in payload.items:
        category = by_code[item.code]
        session.add(
            UserPropertyCategory(
                user_id=account.id,
                category_id=category.id,
                enabled=item.enabled,
                sort_order=item.sort_order,
            )
        )
    await session.flush()
    return [
        {
            "code": item.code,
            "label": by_code[item.code].label,
            "enabled": item.enabled,
            "sort_order": item.sort_order,
        }
        for item in payload.items
    ]


REFERENCE_VALUES = {
    "soil-types": ["red", "black", "alluvial", "sandy_loam", "other"],
    "measurement-units": ["sq_ft", "sq_m", "cent", "acre", "hectare"],
    "title-classifications": ["ryotwari_patta", "natham", "gramathu_natham", "other"],
    "access-types": ["public_road", "private_road", "easement", "no_direct_access", "other"],
}


@router.get("/reference/{kind}")
async def get_reference_values(kind: str, account: AccountUser) -> dict[str, list[str]]:
    values = REFERENCE_VALUES.get(kind)
    if values is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Reference list not found")
    return {"items": values}
