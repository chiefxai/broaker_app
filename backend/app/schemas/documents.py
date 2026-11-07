from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import APIModel
from app.schemas.uploads import UploadContentType

DocumentCategory = Literal["photo", "title_deed", "survey", "soil_report", "voice_memo", "other"]
DocumentVisibility = Literal["private", "shared", "public"]


class DocumentCreate(APIModel):
    object_key: str = Field(min_length=1, max_length=1024)
    filename: str = Field(min_length=1, max_length=255)
    content_type: UploadContentType
    category: DocumentCategory
    display_name: str | None = Field(default=None, max_length=255)


class DocumentPatch(APIModel):
    display_name: str | None = Field(default=None, max_length=255)
    category: DocumentCategory | None = None
    visibility: DocumentVisibility | None = None

    @model_validator(mode="after")
    def require_a_change(self) -> "DocumentPatch":
        if not self.model_fields_set:
            raise ValueError("At least one document field must be provided")
        return self


class DocumentRead(APIModel):
    id: UUID
    property_id: UUID
    filename: str = Field(validation_alias="original_filename", serialization_alias="filename")
    content_type: UploadContentType
    category: DocumentCategory
    display_name: str | None = None
    visibility: DocumentVisibility
    upload_status: Literal["pending", "uploaded", "rejected", "deleted"]
    size_bytes: int | None = Field(default=None, gt=0)
    created_at: datetime


class DocumentDownloadUrlRead(APIModel):
    download_url: str
    expires_in: int = Field(ge=1, le=604800)
