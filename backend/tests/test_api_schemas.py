from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.config.object_storage import UPLOAD_TYPES
from app.schemas import (
    PresignUploadRequest,
    PropertyFeaturesUpdate,
    PropertyFinancialsUpdate,
    PropertyLocationUpdate,
    PropertyPatch,
    UserPropertyCategoriesUpdate,
)
from app.schemas.documents import DocumentCreate


def test_presign_requires_filename_extension_to_match_type() -> None:
    request = PresignUploadRequest(filename="title-deed.pdf", content_type="application/pdf")

    assert request.content_type == "application/pdf"
    with pytest.raises(ValidationError):
        PresignUploadRequest(filename="title-deed.pdf", content_type="image/png")


def test_presign_accepts_supported_voice_memo_formats() -> None:
    voice_formats = [
        ("field-note.m4a", "audio/mp4"),
        ("field-note.aac", "audio/aac"),
        ("field-note.mp3", "audio/mpeg"),
        ("field-note.wav", "audio/wav"),
        ("field-note.webm", "audio/webm"),
    ]
    for filename, content_type in voice_formats:
        request = PresignUploadRequest(filename=filename, content_type=content_type)
        assert request.content_type == content_type
        assert UPLOAD_TYPES["." + filename.rsplit(".", 1)[1]] == content_type


def test_location_requires_latitude_and_longitude_together() -> None:
    with pytest.raises(ValidationError):
        PropertyLocationUpdate(latitude=8.7)

    location = PropertyLocationUpdate(latitude=8.7, longitude=77.7)
    assert location.latitude == Decimal("8.7")


def test_financials_require_consistent_price_and_extent_fields() -> None:
    with pytest.raises(ValidationError):
        PropertyFinancialsUpdate(asking_price_inr=100, minimum_price_inr=101)
    with pytest.raises(ValidationError):
        PropertyFinancialsUpdate(area=10)


def test_patch_requires_a_change() -> None:
    with pytest.raises(ValidationError):
        PropertyPatch()

    assert PropertyPatch(title="Updated listing").title == "Updated listing"


def test_custom_soil_requires_custom_description() -> None:
    with pytest.raises(ValidationError):
        PropertyFeaturesUpdate(soil_type="other")

    assert PropertyFeaturesUpdate(soil_type="other", soil_type_other="Clay mix")


def test_per_user_categories_reject_duplicate_codes() -> None:
    with pytest.raises(ValidationError):
        UserPropertyCategoriesUpdate(
            items=[
                {"code": "agriculture", "enabled": True, "sort_order": 0},
                {"code": "agriculture", "enabled": False, "sort_order": 1},
            ]
        )


def test_voice_memo_document_uses_private_category_and_supported_media_type() -> None:
    voice_memo = DocumentCreate(
        object_key="users/test/properties/123/documents/recording.m4a",
        filename="field-note.m4a",
        content_type="audio/mp4",
        category="voice_memo",
    )

    assert voice_memo.category == "voice_memo"
    assert voice_memo.content_type == "audio/mp4"
