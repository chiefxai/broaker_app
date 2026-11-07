from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models import PropertySigningAuthority
from app.routes import signing_authorities as routes
from app.schemas.signing_authorities import SigningAuthoritiesUpdate


def test_signing_authority_input_validates_required_fields_and_maximum() -> None:
    valid = SigningAuthoritiesUpdate(
        items=[{"name": " Asha Nair ", "relationship": " Co-owner ", "phone": " "}]
    )
    assert valid.items[0].name == "Asha Nair"
    assert valid.items[0].relationship == "Co-owner"
    assert valid.items[0].phone is None
    assert SigningAuthoritiesUpdate(items=[]).items == []

    with pytest.raises(ValidationError):
        SigningAuthoritiesUpdate(items=[{"name": "   ", "relationship": "Owner"}])
    with pytest.raises(ValidationError):
        SigningAuthoritiesUpdate(
            items=[{"name": f"Signer {i}", "relationship": "Owner"} for i in range(7)]
        )
    with pytest.raises(ValidationError):
        SigningAuthoritiesUpdate(
            items=[{"name": "Asha", "relationship": "Owner", "verification_status": "verified"}]
        )


class _Rows:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows


class _Session:
    def __init__(self):
        self.rows = []

    async def execute(self, statement):
        if statement.__visit_name__ == "delete":
            self.rows.clear()
            return None
        return _Rows(list(self.rows))

    def add_all(self, rows):
        self.rows.extend(rows)

    async def flush(self):
        now = datetime.now(UTC)
        for row in self.rows:
            row.id = getattr(row, "id", None) or uuid4()
            row.verification_status = row.verification_status or "pending"
            row.signature_status = row.signature_status or "pending"
            row.created_at = getattr(row, "created_at", None) or now
            row.updated_at = now

    async def refresh(self, _row):
        return None


@pytest.mark.asyncio
async def test_signing_authorities_get_and_replace_are_property_scoped(monkeypatch) -> None:
    property_id = uuid4()
    owner = SimpleNamespace(id=uuid4())
    session = _Session()
    checked = []

    async def check_owner(_session, checked_property_id, owner_id):
        checked.append((checked_property_id, owner_id))
        return SimpleNamespace(id=checked_property_id)

    monkeypatch.setattr(routes, "owned_property", check_owner)
    saved = await routes.replace_signing_authorities(
        property_id,
        SigningAuthoritiesUpdate(
            items=[
                {
                    "name": "Asha Nair",
                    "relationship": "Co-owner",
                    "record_label": "Patta",
                    "record_value": "P-42",
                }
            ]
        ),
        owner,
        session,
    )
    assert len(saved["items"]) == 1
    assert saved["items"][0].verification_status == "pending"
    assert saved["items"][0].signature_status == "pending"

    fetched = await routes.get_signing_authorities(property_id, owner, session)
    assert fetched["items"][0].name == "Asha Nair"

    cleared = await routes.replace_signing_authorities(
        property_id, SigningAuthoritiesUpdate(items=[]), owner, session
    )
    assert cleared == {"items": []}
    assert len(checked) == 3
    assert all(item == (property_id, owner.id) for item in checked)


def test_authority_model_has_only_pending_states() -> None:
    assert PropertySigningAuthority.__table__.c.verification_status.server_default.arg == "pending"
    assert PropertySigningAuthority.__table__.c.signature_status.server_default.arg == "pending"
    assert PropertySigningAuthority.__table__.c.created_at.server_default is not None
    assert PropertySigningAuthority.__table__.c.updated_at.server_default is not None
