from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.routes import sharing
from app.schemas.sharing import ShareLinkPatch


class MemorySession:
    async def flush(self):
        return None

    async def refresh(self, _link):
        return None


@pytest.mark.asyncio
async def test_patch_share_link_serializes_disclosures_before_persisting(monkeypatch):
    link = SimpleNamespace(
        id=uuid4(),
        title="Original title",
        expires_at=None,
        disclosures={},
        revoked_at=None,
        created_at=None,
        token_ciphertext=None,
    )
    account = SimpleNamespace(id=uuid4())
    session = MemorySession()

    async def get_owned_link(_link_id, _account, _session):
        return link

    monkeypatch.setattr(sharing, "link_for_owner", get_owned_link)
    monkeypatch.setattr(sharing, "link_read", lambda saved: {"id": saved.id, "title": saved.title})
    payload = ShareLinkPatch.model_validate(
        {
            "title": "Updated title",
            "disclosures": {
                "show_price": True,
                "show_exact_coordinates": False,
                "show_photos": True,
                "show_reports": False,
                "show_approach_roads": False,
            },
        }
    )

    result = await sharing.patch_share_link(link.id, payload, account, session)

    assert link.title == "Updated title"
    assert link.disclosures == payload.disclosures.model_dump()
    assert result == {"id": link.id, "title": "Updated title"}
