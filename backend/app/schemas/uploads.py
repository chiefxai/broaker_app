from pathlib import PurePosixPath
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import APIModel

UploadContentType = Literal[
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/mp4",
    "audio/aac",
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
]

ALLOWED_UPLOAD_SUFFIXES: dict[str, str] = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
}


class PresignUploadRequest(APIModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: UploadContentType

    @model_validator(mode="after")
    def filename_matches_content_type(self) -> "PresignUploadRequest":
        suffix = PurePosixPath(self.filename).suffix.lower()
        if ALLOWED_UPLOAD_SUFFIXES.get(suffix) != self.content_type:
            raise ValueError("Filename extension must match a supported document content type")
        return self


class PresignUploadResponse(APIModel):
    upload_url: str
    object_key: str
    method: Literal["PUT"]
    expires_in: int = Field(ge=1, le=604800)
    content_type: UploadContentType
