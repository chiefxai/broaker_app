from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.routes import sharing
from app.schemas.sharing import ProfileShareLinkCreate, ProfileShareLinkPatch


def test_profile_link_requires_at_least_one_section_and_protects_passcodes():
    with pytest.raises(ValidationError):
        ProfileShareLinkCreate(title="Empty", include_profile=False, include_properties=False)
    with pytest.raises(ValidationError):
        ProfileShareLinkCreate(title="Protected", visibility="protected", passcode="abc123")
    payload = ProfileShareLinkCreate(
        title="Portfolio", include_profile=False, include_properties=True
    )
    assert payload.include_properties is True
    assert payload.include_profile is False


def test_grouped_profile_link_requires_two_unique_property_ids():
    first, second = uuid4(), uuid4()
    payload = ProfileShareLinkCreate(
        title="Selected farms", include_profile=False, include_properties=True,
        property_ids=[first, second],
    )
    assert payload.property_ids == [first, second]
    with pytest.raises(ValidationError):
        ProfileShareLinkCreate(title="One property", property_ids=[first])
    with pytest.raises(ValidationError):
        ProfileShareLinkCreate(title="Duplicate", property_ids=[first, first])


class Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class Session:
    def __init__(self, link):
        self.link = link

    async def execute(self, _statement):
        if _statement.column_descriptions[0]["entity"] is sharing.ProfileShareLink:
            return Result(self.link)
        self.property_query = str(_statement)
        return PropertyResult(
            [
                SimpleNamespace(
                    id=uuid4(),
                    title="Active Farm",
                    description="A useful farm",
                    primary_category_id=uuid4(),
                )
            ]
        )

    async def get(self, model, _record_id):
        if model.__name__ == "BusinessProfile":
            return SimpleNamespace(
                business_name="Safe Realty",
                public_phone="+919876543210",
                public_email="hello@example.test",
                city="Madurai",
                district="Madurai",
                state="Tamil Nadu",
                user_id=uuid4(),
            )
        if model.__name__ == "BrokerProfile":
            return SimpleNamespace(
                designation="Property Consultant",
                legal_name="Private Legal Name",
                mobile_phone="+910000000000",
                license_number="PRIVATE-LICENSE",
            )
        if model.__name__ == "PropertyCategory":
            return SimpleNamespace(code="agriculture")
        if model.__name__ == "PropertyFinancials":
            return SimpleNamespace(asking_price_inr=2500000, area=40, area_unit="acre")
        if model.__name__ == "PropertyLocation":
            return SimpleNamespace(
                district="Madurai", state="Tamil Nadu", latitude=9.9, longitude=78.1
            )
        raise AssertionError(f"Unexpected public profile query: {model}")

    async def flush(self):
        return None


class PropertyResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return self

    def all(self):
        return self.values


@pytest.mark.asyncio
async def test_profile_share_link_rejects_revoked_and_expired_tokens():
    revoked = SimpleNamespace(
        token_hash=sharing.token_digest("token"), revoked_at=datetime.now(UTC), expires_at=None
    )
    with pytest.raises(HTTPException) as error:
        await sharing.active_profile_share("token", Session(revoked), None, None)
    assert error.value.status_code == 404

    expired = SimpleNamespace(
        token_hash=sharing.token_digest("token"),
        revoked_at=None,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    with pytest.raises(HTTPException) as error:
        await sharing.active_profile_share("token", Session(expired), None, None)
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_profile_share_requires_passcode_only_when_protected():
    link = SimpleNamespace(
        token_hash=sharing.token_digest("token"),
        revoked_at=None,
        expires_at=None,
        visibility="protected",
        passcode_hash=sharing.passcode_digest("123456"),
    )
    with pytest.raises(HTTPException) as error:
        await sharing.active_profile_share("token", Session(link), "000000", None)
    assert error.value.status_code == 401
    assert await sharing.active_profile_share("token", Session(link), "123456", None) is link


@pytest.mark.asyncio
async def test_profile_share_link_can_update_sections_and_protect_access():
    owner_id = uuid4()
    link = SimpleNamespace(
        id=uuid4(), owner_user_id=owner_id, title="Old profile", include_profile=True,
        include_properties=True, visibility="unlisted", passcode_hash=None,
        expires_at=None, revoked_at=None, token_ciphertext=None,
        created_at=datetime.now(UTC),
    )
    result = await sharing.update_profile_share_link(
        link.id,
        ProfileShareLinkPatch(
            title="Updated profile", include_profile=False, visibility="protected",
            passcode="123456",
        ),
        SimpleNamespace(id=owner_id),
        Session(link),
    )

    assert result["title"] == "Updated profile"
    assert result["include_profile"] is False
    assert result["include_properties"] is True
    assert result["visibility"] == "protected"
    assert sharing.passcode_matches("123456", link.passcode_hash)


@pytest.mark.asyncio
async def test_profile_share_link_cannot_drop_both_sections():
    owner_id = uuid4()
    link = SimpleNamespace(
        id=uuid4(), owner_user_id=owner_id, title="Profile", include_profile=True,
        include_properties=False, visibility="unlisted", passcode_hash=None,
        expires_at=None, revoked_at=None, token_ciphertext=None,
        created_at=datetime.now(UTC),
    )
    with pytest.raises(HTTPException) as error:
        await sharing.update_profile_share_link(
            link.id,
            ProfileShareLinkPatch(include_profile=False),
            SimpleNamespace(id=owner_id),
            Session(link),
        )
    assert error.value.status_code == 422


def test_public_profile_schema_contains_only_explicitly_public_fields():
    from app.schemas.sharing import PublicBrokerProfileRead

    assert set(PublicBrokerProfileRead.model_fields) == {
        "business_name",
        "professional_title",
        "public_phone",
        "public_email",
        "city",
        "district",
        "state",
    }


@pytest.mark.asyncio
async def test_public_profile_share_returns_only_public_profile_and_active_property_fields():
    link = SimpleNamespace(
        token_hash=sharing.token_digest("token"),
        revoked_at=None,
        expires_at=None,
        visibility="unlisted",
        owner_user_id=uuid4(),
        include_profile=True,
        include_properties=True,
        property_ids=[str(uuid4()), str(uuid4())],
    )
    session = Session(link)
    response = SimpleNamespace(headers={})
    result = await sharing.public_profile_share(
        "token", session, response, SimpleNamespace(client=None)
    )

    assert result["profile"] == {
        "business_name": "Safe Realty",
        "professional_title": "Property Consultant",
        "public_phone": "+919876543210",
        "public_email": "hello@example.test",
        "city": "Madurai",
        "district": "Madurai",
        "state": "Tamil Nadu",
    }
    assert result["properties"] == [
        {
            "public_listing_token": result["properties"][0]["public_listing_token"],
            "title": "Active Farm",
            "description": "A useful farm",
            "category": "agriculture",
            "asking_price_inr": 2500000,
            "area": 40,
            "area_unit": "acre",
            "approximate_location": "Madurai, Tamil Nadu",
        }
    ]
    assert result["properties"][0]["public_listing_token"].startswith("token~")
    assert "status =" in session.property_query
    assert "properties.id IN" in session.property_query
    assert response.headers["Cache-Control"] == "no-store"


@pytest.mark.asyncio
async def test_grouped_property_ids_must_be_active_and_owned():
    first, second = uuid4(), uuid4()
    owner_id = uuid4()

    class SelectionSession:
        async def execute(self, _statement):
            return PropertyResult([first, second])

    result = await sharing.validate_profile_property_ids(
        SelectionSession(), owner_id, [first, second]
    )
    assert result == [str(first), str(second)]

    class IncompleteSelectionSession:
        async def execute(self, _statement):
            return PropertyResult([first])

    with pytest.raises(HTTPException) as error:
        await sharing.validate_profile_property_ids(
            IncompleteSelectionSession(), owner_id, [first, second]
        )
    assert error.value.status_code == 422
