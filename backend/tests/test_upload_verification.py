from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.routes import documents
from app.schemas.documents import DocumentCreate, DocumentPatch
from app.services import uploads


@pytest.mark.parametrize(
    ("content_type", "prefix", "expected"),
    [
        ("application/pdf", b"%PDF-1.7", True),
        ("image/jpeg", b"\xff\xd8\xff\xe0", True),
        ("image/png", b"\x89PNG\r\n\x1a\n", True),
        ("image/webp", b"RIFF\x00\x00\x00\x00WEBP", True),
        ("audio/mp4", b"\x00\x00\x00\x18ftypM4A ", True),
        ("audio/aac", b"\xff\xf1\x50\x80", True),
        ("audio/mpeg", b"ID3\x04\x00", True),
        ("audio/wav", b"RIFF\x00\x00\x00\x00WAVE", True),
        ("audio/webm", b"\x1a\x45\xdf\xa3\x93\x42", True),
        ("application/pdf", b"not a pdf", False),
        ("image/jpeg", b"%PDF-1.7", False),
        ("image/png", b"\x89PNG\r\n", False),
        ("image/webp", b"RIFF1234NOPE", False),
        ("audio/mp4", b"not an audio file", False),
        ("audio/aac", b"not an audio file", False),
        ("audio/mpeg", b"not an audio file", False),
        ("audio/wav", b"RIFF1234NOPE", False),
        ("audio/webm", b"not an audio file", False),
    ],
)
def test_signature_validation_matches_declared_mime(content_type, prefix, expected):
    assert uploads._matches_upload_signature(content_type, prefix) is expected


def test_local_s3_defaults_are_not_applied_in_production():
    local = Settings(
        environment="local",
        s3_endpoint_url="",
        s3_public_endpoint_url="",
        s3_bucket_name="",
        s3_access_key_id="",
        s3_secret_access_key="",
    )
    production = Settings(
        environment="production",
        s3_endpoint_url="",
        s3_public_endpoint_url="",
        s3_bucket_name="",
        s3_access_key_id="",
        s3_secret_access_key="",
    )

    assert local.s3_endpoint_url == "http://localhost:9000"
    assert local.s3_public_endpoint_url == "http://localhost:9000"
    assert local.s3_bucket_name == "broaker-documents"
    assert local.s3_access_key_id == "broaker-minio"
    assert local.s3_secret_access_key == "local-minio-password"
    assert production.s3_endpoint_url == ""
    assert production.s3_bucket_name == ""
    assert production.s3_access_key_id == ""


@pytest.mark.asyncio
async def test_upload_verification_checks_size_before_reading_signature(monkeypatch):
    async def head_object(_key):
        return {"ContentLength": 11, "ContentType": "application/pdf"}

    monkeypatch.setattr(uploads, "verify_object_exists", head_object)

    with pytest.raises(ValueError, match="exceeds"):
        await uploads.verify_property_upload(
            "private/key.pdf", expected_content_type="application/pdf", max_size_bytes=10
        )


@pytest.mark.asyncio
async def test_upload_verification_checks_magic_bytes(monkeypatch):
    async def head_object(_key):
        return {"ContentLength": 9, "ContentType": "application/pdf"}

    class FakeBody:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def read(self):
            return b"not a pdf"

    class FakeClient:
        async def get_object(self, **kwargs):
            assert kwargs["Range"] == "bytes=0-15"
            return {"Body": FakeBody()}

    class FakeClientContext:
        async def __aenter__(self):
            return FakeClient()

        async def __aexit__(self, *_args):
            return False

    class FakeSession:
        def client(self, **_kwargs):
            return FakeClientContext()

    monkeypatch.setattr(uploads, "verify_object_exists", head_object)
    monkeypatch.setattr(uploads.aioboto3, "Session", FakeSession)
    monkeypatch.setattr(
        uploads,
        "get_settings",
        lambda: Settings(
            environment="production",
            s3_bucket_name="documents",
            s3_endpoint_url="http://storage",
        ),
    )

    with pytest.raises(ValueError, match="contents do not match"):
        await uploads.verify_property_upload(
            "private/key.pdf", expected_content_type="application/pdf", max_size_bytes=10
        )


@pytest.mark.asyncio
async def test_valid_upload_signature_returns_verified_storage_metadata(monkeypatch):
    expected_metadata = {"ContentLength": 8, "ContentType": "application/pdf"}

    async def head_object(_key):
        return expected_metadata

    class FakeBody:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def read(self):
            return b"%PDF-1.7"

    class FakeClient:
        async def get_object(self, **kwargs):
            assert kwargs["Range"] == "bytes=0-15"
            return {"Body": FakeBody()}

    class FakeClientContext:
        async def __aenter__(self):
            return FakeClient()

        async def __aexit__(self, *_args):
            return False

    class FakeSession:
        def client(self, **_kwargs):
            return FakeClientContext()

    monkeypatch.setattr(uploads, "verify_object_exists", head_object)
    monkeypatch.setattr(uploads.aioboto3, "Session", FakeSession)
    monkeypatch.setattr(
        uploads,
        "get_settings",
        lambda: Settings(environment="production", s3_bucket_name="documents"),
    )

    result = await uploads.verify_property_upload(
        "private/key.pdf", expected_content_type="application/pdf", max_size_bytes=8
    )

    assert result is expected_metadata


@pytest.mark.asyncio
async def test_document_registration_returns_uploaded_after_storage_verification(monkeypatch):
    async def owned_property(*_args):
        return object()

    async def verify_object(*_args, **_kwargs):
        return {"ContentLength": 8, "ContentType": "application/pdf"}

    class FakeSession:
        def add(self, row):
            self.row = row

        async def flush(self):
            pass

        async def refresh(self, _row):
            pass

    monkeypatch.setattr(documents, "owned_property", owned_property)
    monkeypatch.setattr(documents, "verify_property_upload", verify_object)
    property_id = uuid4()
    account_id = uuid4()
    result = await documents.register_document(
        property_id,
        DocumentCreate(
            object_key=f"users/test/properties/{property_id}/documents/file.pdf",
            filename="title-deed.pdf",
            content_type="application/pdf",
            category="title_deed",
        ),
        user={"sub": "test"},
        account=SimpleNamespace(id=account_id),
        session=FakeSession(),
    )

    assert result.upload_status == "uploaded"
    assert result.size_bytes == 8
    assert result.category == "title_deed"


@pytest.mark.asyncio
async def test_document_registration_maps_verification_failure_to_422(monkeypatch):
    async def owned_property(*_args):
        return object()

    async def reject_object(*_args, **_kwargs):
        raise ValueError("Uploaded file contents do not match the declared content type")

    monkeypatch.setattr(documents, "owned_property", owned_property)
    monkeypatch.setattr(documents, "verify_property_upload", reject_object)
    property_id = uuid4()

    with pytest.raises(HTTPException) as error:
        await documents.register_document(
            property_id,
            DocumentCreate(
                object_key=f"users/test/properties/{property_id}/documents/file.pdf",
                filename="title-deed.pdf",
                content_type="application/pdf",
                category="title_deed",
            ),
            user={"sub": "test"},
            account=SimpleNamespace(id=uuid4()),
            session=object(),
        )

    assert error.value.status_code == 422
    assert error.value.detail == "Uploaded file contents do not match the declared content type"


@pytest.mark.asyncio
async def test_voice_memo_visibility_cannot_be_changed_to_shared(monkeypatch):
    row = SimpleNamespace(category="voice_memo", visibility="private")

    async def owned_document(*_args):
        return row

    monkeypatch.setattr(documents, "document_for_owner", owned_document)

    with pytest.raises(HTTPException) as error:
        await documents.patch_document(
            uuid4(),
            DocumentPatch(visibility="shared"),
            account=SimpleNamespace(id=uuid4()),
            session=object(),
        )

    assert error.value.status_code == 422
    assert error.value.detail == "Voice logs must remain private"
