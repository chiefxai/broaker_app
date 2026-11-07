from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import Response

from app.routes import sharing
from app.schemas.sharing import ShareLinkPage
from app.services.share_tokens import encrypt_share_token


class FakeResult:
    def __init__(self, *, total=None, links=()):
        self.total = total
        self.links = links

    def scalar_one(self):
        return self.total

    def scalar_one_or_none(self):
        return self.links[0] if self.links else None

    def scalars(self):
        return self

    def all(self):
        return self.links


class FakeSession:
    def __init__(self, total, links):
        self.results = [FakeResult(total=total), FakeResult(links=links)]
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return self.results.pop(0)


@pytest.mark.asyncio
async def test_share_link_list_returns_paginated_items_and_total(monkeypatch):
    property_id = uuid4()
    now = datetime.now(UTC)
    links = [
        SimpleNamespace(
            id=uuid4(),
            title=f"Link {number}",
            expires_at=None,
            revoked_at=None,
            created_at=now,
            disclosures={
                "show_price": False,
                "show_exact_coordinates": False,
                "show_photos": True,
                "show_reports": False,
                "show_approach_roads": False,
            },
        )
        for number in range(2)
    ]
    session = FakeSession(total=5, links=links)

    async def allow_property(_session, requested_id, _owner_id):
        assert requested_id == property_id

    monkeypatch.setattr(sharing, "owned_property", allow_property)

    result = await sharing.list_share_links(
        property_id,
        SimpleNamespace(id=uuid4()),
        session,
        limit=2,
        offset=2,
    )

    assert result["items"][0]["id"] == links[0].id
    assert result["limit"] == 2
    assert result["offset"] == 2
    assert result["total"] == 5
    page_statement = session.statements[1]
    assert "LIMIT" in str(page_statement).upper()
    assert "OFFSET" in str(page_statement).upper()


def test_share_link_page_rejects_out_of_range_pagination():
    with pytest.raises(ValueError):
        ShareLinkPage(items=[], limit=101, offset=0, total=0)


def test_owner_link_read_recovers_the_encrypted_public_url(monkeypatch):
    from cryptography.fernet import Fernet
    from pydantic import SecretStr

    key = Fernet.generate_key().decode("ascii")
    token = "a-secure-public-token"
    link = SimpleNamespace(
        id=uuid4(), title="Farm preview", expires_at=None, revoked_at=None,
        created_at=datetime.now(UTC), disclosures={},
        token_ciphertext=encrypt_share_token(token, key),
    )
    monkeypatch.setattr(
        sharing,
        "get_settings",
        lambda: SimpleNamespace(
            public_api_base_url="https://api.example.test",
            api_v1_prefix="/api/v1",
            share_link_encryption_key=SecretStr(key),
        ),
    )

    assert sharing.link_read(link)["public_url"] == (
        f"https://api.example.test/api/v1/public/listings/{token}"
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("revoked, expires_at", [
    (datetime.now(UTC), None),
    (None, datetime(2020, 1, 1, tzinfo=UTC)),
])
async def test_public_link_rejects_revoked_and_expired_tokens(revoked, expires_at):
    link = SimpleNamespace(
        id=uuid4(), property_id=uuid4(), revoked_at=revoked, expires_at=expires_at
    )
    session = FakeSession(total=None, links=[link])
    with pytest.raises(sharing.HTTPException) as error:
        await sharing.active_public_link("a-valid-token", session)
    assert error.value.status_code == 404


def test_disclosure_schema_has_permission_defaults_for_new_links():
    from app.schemas.sharing import ShareDisclosures

    disclosures = ShareDisclosures()
    assert disclosures.show_name is True
    assert disclosures.show_description is True
    assert disclosures.show_location is True
    assert disclosures.show_specifications is True
    assert disclosures.show_documents is False


@pytest.mark.asyncio
async def test_public_listing_omits_fields_disabled_for_that_link(monkeypatch):
    property_record = SimpleNamespace(
        id=uuid4(), status="active", title="Private farm name", description="Private details",
        primary_category_id=uuid4(),
    )
    link = SimpleNamespace(disclosures={
        "show_name": False,
        "show_description": False,
        "show_location": False,
        "show_price": False,
        "show_specifications": False,
        "show_exact_coordinates": False,
        "show_photos": False,
        "show_documents": False,
        "show_reports": False,
        "show_approach_roads": False,
    })

    async def active_link(_token, _session, _passcode=None, _client_address=None, _account=None):
        return link, property_record

    class ListingSession:
        async def get(self, model, _record_id):
            return SimpleNamespace(district="Private district", state="Private state")

    monkeypatch.setattr(sharing, "active_public_link", active_link)
    response = Response()
    result = await sharing.public_listing(
        "valid-token", ListingSession(), response, SimpleNamespace(client=None)
    )

    assert result == {}
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.asyncio
async def test_public_listing_includes_only_public_business_contact_when_enabled(monkeypatch):
    owner_id = uuid4()
    property_record = SimpleNamespace(
        id=uuid4(), owner_user_id=owner_id, status="draft", title="Fieldstone Farm",
        description=None, primary_category_id=uuid4(),
    )
    link = SimpleNamespace(disclosures={
        "show_name": False, "show_description": False, "show_location": False,
        "show_price": False, "show_specifications": False, "show_exact_coordinates": False,
        "show_photos": False, "show_documents": False, "show_reports": False,
        "show_approach_roads": False, "show_broker_contact": True,
    })
    business = SimpleNamespace(
        business_name="Fieldstone Realty", public_phone="+919876543210",
        public_email="hello@example.com", city="Chennai", district="Chennai", state="Tamil Nadu",
    )

    async def active_link(_token, _session, _passcode=None, _client_address=None, _account=None):
        return link, property_record

    class ListingSession:
        async def get(self, model, record_id):
            from app.models import BusinessProfile, PropertyLocation

            if model is BusinessProfile:
                assert record_id == owner_id
                return business
            if model is PropertyLocation:
                return None
            raise AssertionError(f"Unexpected model lookup: {model}")

    monkeypatch.setattr(sharing, "active_public_link", active_link)
    result = await sharing.public_listing(
        "valid-token", ListingSession(), Response(), SimpleNamespace(client=None)
    )

    assert result == {
        "broker_contact": {
            "business_name": "Fieldstone Realty", "public_phone": "+919876543210",
            "public_email": "hello@example.com", "city": "Chennai", "district": "Chennai",
            "state": "Tamil Nadu",
        }
    }
