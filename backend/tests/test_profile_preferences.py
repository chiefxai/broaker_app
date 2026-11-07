from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.routes.profiles import patch_preferences
from app.schemas.profiles import UserPreferencesPatch


class MemorySession:
    def __init__(self, row):
        self.row = row

    async def get(self, _model, _user_id):
        return self.row

    async def flush(self):
        return None

    async def refresh(self, _row):
        return None


@pytest.mark.asyncio
async def test_patch_preferences_persists_nested_disclosures_as_json_data():
    row = SimpleNamespace(
        language="en",
        theme="light",
        default_disclosures={},
        default_expiration_days=None,
    )
    session = MemorySession(row)
    account = SimpleNamespace(id=uuid4())
    payload = UserPreferencesPatch.model_validate(
        {
            "language": "en",
            "default_expiration_days": 30,
            "default_disclosures": {
                "show_price": False,
                "show_exact_coordinates": False,
                "show_photos": True,
                "show_reports": False,
                "show_approach_roads": False,
            },
        }
    )

    await patch_preferences(payload, account, session)

    assert row.language == "en"
    assert row.default_disclosures == payload.default_disclosures.model_dump()
    assert row.default_expiration_days == 30


def test_default_expiration_days_accept_only_supported_choices():
    with pytest.raises(ValidationError):
        UserPreferencesPatch.model_validate({"default_expiration_days": 2})
