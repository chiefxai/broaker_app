"""Dashboard summary route."""

from collections import Counter

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.dependencies import AccountUser, DatabaseSession
from app.models import Property
from app.schemas.properties import DashboardRead
from app.services.properties import property_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardRead)
async def dashboard(account: AccountUser, session: DatabaseSession) -> DashboardRead:
    rows = (
        (await session.execute(select(Property).where(Property.owner_user_id == account.id)))
        .scalars()
        .all()
    )
    counts = Counter(row.status for row in rows)
    recent = sorted(rows, key=lambda item: item.updated_at, reverse=True)[:5]
    return DashboardRead(
        property_counts={key: counts.get(key, 0) for key in ("draft", "active", "archived")},
        recent_properties=[await property_summary(session, row) for row in recent],
    )
