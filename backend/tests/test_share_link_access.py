from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.routes import sharing
from app.schemas.sharing import ShareLinkCreate, ShareLinkPatch


def test_passcodes_are_salted_and_verified_without_plaintext_storage():
    first = sharing.passcode_digest("123456")
    second = sharing.passcode_digest("123456")
    assert first != second
    assert sharing.passcode_matches("123456", first)
    assert not sharing.passcode_matches("654321", first)
    assert not sharing.passcode_matches("123456", "invalid")


def test_protected_link_requires_numeric_passcode():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ShareLinkCreate(title="Protected", visibility="protected", disclosures={}, passcode=None)
    with pytest.raises(ValidationError):
        ShareLinkCreate(title="Protected", visibility="protected", disclosures={}, passcode="ab12")
    with pytest.raises(ValidationError):
        ShareLinkCreate(title="Public", visibility="public", disclosures={})
    assert ShareLinkCreate(title="Unlisted", disclosures={}).visibility == "unlisted"
    unlisted = ShareLinkCreate(title="Unlisted", disclosures={})
    assert unlisted.disclosures.show_broker_contact is False


def test_patch_rejects_unsupported_public_mode():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ShareLinkPatch(visibility="public")


class Result:
    def __init__(self, value=None):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class Session:
    def __init__(self, link, prop):
        self.link = link
        self.prop = prop

    async def execute(self, _statement):
        return Result(self.link)

    async def get(self, _model, _record_id):
        return self.prop


@pytest.mark.asyncio
async def test_private_link_requires_sign_in_and_only_owner_can_open():
    link = SimpleNamespace(
        token_hash=sharing.token_digest("valid-token"), property_id=uuid4(),
        revoked_at=None, expires_at=None, visibility="private",
    )
    with pytest.raises(HTTPException) as error:
        session = Session(link, SimpleNamespace(status="active", owner_user_id=uuid4()))
        await sharing.active_public_link("valid-token", session)
    assert error.value.status_code == 401

    owner_id = uuid4()
    session = Session(link, SimpleNamespace(status="active", owner_user_id=owner_id))
    with pytest.raises(HTTPException) as error:
        await sharing.active_public_link(
            "valid-token", session, account=SimpleNamespace(id=uuid4())
        )
    assert error.value.status_code == 404

    result, _ = await sharing.active_public_link(
        "valid-token", session, account=SimpleNamespace(id=owner_id)
    )
    assert result is link


@pytest.mark.asyncio
async def test_protected_link_requires_and_accepts_correct_passcode():
    link = SimpleNamespace(
        token_hash=sharing.token_digest("valid-token"), property_id=uuid4(),
        revoked_at=None, expires_at=None, visibility="protected",
        passcode_hash=sharing.passcode_digest("987654"),
    )
    session = Session(link, SimpleNamespace(status="active", owner_user_id=uuid4()))
    with pytest.raises(HTTPException) as error:
        await sharing.active_public_link("valid-token", session)
    assert error.value.status_code == 401
    with pytest.raises(HTTPException) as error:
        await sharing.active_public_link("valid-token", session, "111111")
    assert error.value.status_code == 401
    result, _ = await sharing.active_public_link("valid-token", session, "987654")
    assert result is link


@pytest.mark.asyncio
async def test_saved_draft_property_can_be_shared_but_archived_property_cannot():
    link = SimpleNamespace(
        token_hash=sharing.token_digest("valid-token"), property_id=uuid4(),
        revoked_at=None, expires_at=None, visibility="unlisted",
    )
    result, prop = await sharing.active_public_link(
        "valid-token", Session(link, SimpleNamespace(status="draft", owner_user_id=uuid4()))
    )
    assert result is link
    assert prop.status == "draft"

    with pytest.raises(HTTPException) as error:
        await sharing.active_public_link(
            "valid-token", Session(link, SimpleNamespace(status="archived", owner_user_id=uuid4()))
        )
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_profile_listing_token_rechecks_parent_access_and_uses_default_disclosures(
    monkeypatch,
):
    owner_id = uuid4()
    property_id = uuid4()
    property_record = SimpleNamespace(id=property_id, owner_user_id=owner_id, status="active")
    profile_link = SimpleNamespace(owner_user_id=owner_id, include_properties=True)

    async def active_profile(token, session, passcode, client_address):
        assert token == "profile-token"
        assert passcode == "654321"
        return profile_link

    class ProfilePropertySession:
        async def execute(self, _statement):
            return Result(property_record)

        async def get(self, model, _record_id):
            assert model.__name__ == "UserPreference"
            return SimpleNamespace(default_disclosures={"show_price": True})

    monkeypatch.setattr(sharing, "active_profile_share", active_profile)
    link, prop = await sharing.active_public_link(
        f"profile-token~{property_id}", ProfilePropertySession(), "654321", "192.0.2.4"
    )

    assert prop is property_record
    assert link.disclosures["show_price"] is True
    assert link.disclosures["show_photos"] is True

    profile_link.property_disclosures = {
        str(property_id): {"show_price": False, "show_photos": False}
    }
    overridden_link, _ = await sharing.active_public_link(
        f"profile-token~{property_id}", ProfilePropertySession(), "654321", "192.0.2.4"
    )
    assert overridden_link.disclosures["show_price"] is False
    assert overridden_link.disclosures["show_photos"] is False

    profile_link.include_properties = False
    with pytest.raises(HTTPException) as error:
        await sharing.active_public_link(
            f"profile-token~{property_id}", ProfilePropertySession(), "654321", "192.0.2.4"
        )
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_protected_passcode_limits_failed_attempts_per_link_and_client(monkeypatch):
    class FakeRedis:
        def __init__(self):
            self.count = 0

        async def incr(self, _key):
            self.count += 1
            return self.count

        async def expire(self, _key, _seconds):
            return True

    redis = FakeRedis()
    monkeypatch.setattr(sharing, "get_redis_client", lambda: redis)
    for _ in range(5):
        with pytest.raises(HTTPException) as error:
            await sharing.require_valid_share_passcode(
                "protected-token", "incorrect", "invalid-hash", "192.0.2.10"
            )
        assert error.value.status_code == 401
    with pytest.raises(HTTPException) as error:
        await sharing.require_valid_share_passcode(
            "protected-token", "incorrect", "invalid-hash", "192.0.2.10"
        )
    assert error.value.status_code == 429


def test_share_link_response_never_contains_the_passcode_hash():
    link = SimpleNamespace(
        id=uuid4(), title="Protected listing", visibility="protected", passcode_hash="salt:hash",
        expires_at=None, revoked_at=None, created_at=datetime.now(UTC), disclosures={},
        token_ciphertext=None,
    )
    read = sharing.link_read(link)
    assert read["visibility"] == "protected"
    assert "passcode" not in read
    assert "passcode_hash" not in read
