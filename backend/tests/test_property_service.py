from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models import Property, PropertyCategory, PropertyLocation
from app.services.properties import property_summary


class FakeSession:
    def __init__(self, category_id, completed_models=()) -> None:
        self.category = PropertyCategory(
            id=category_id, code="agriculture", label="Agriculture Land", sort_order=0
        )
        self.completed_models = set(completed_models)

    async def get(self, model, _key):
        if model is PropertyCategory:
            return self.category
        return SimpleNamespace() if model in self.completed_models else None


@pytest.mark.asyncio
async def test_property_summary_counts_completed_sections() -> None:
    category_id = uuid4()
    now = datetime.now(UTC)
    prop = Property(
        id=uuid4(),
        owner_user_id=uuid4(),
        title="Test listing",
        primary_category_id=category_id,
        status="draft",
        created_at=now,
        updated_at=now,
    )

    summary = await property_summary(FakeSession(category_id), prop)

    assert summary["completion_percent"] == 0
    summary = await property_summary(FakeSession(category_id, (PropertyLocation,)), prop)
    assert summary["completion_percent"] == 25
