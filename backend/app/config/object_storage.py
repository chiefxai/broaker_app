from pathlib import PurePosixPath
from uuid import uuid4

import aioboto3
from botocore.config import Config

from app.core.config import get_settings

UPLOAD_TYPES: dict[str, str] = {
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

_session = aioboto3.Session()


async def create_document_upload_url(
    *, user_id: str, filename: str, content_type: str
) -> dict[str, str | int]:
    """Create a short-lived, user-scoped S3-compatible PUT URL for a document."""
    settings = get_settings()
    suffix = PurePosixPath(filename).suffix.lower()
    if UPLOAD_TYPES.get(suffix) != content_type:
        raise ValueError("Filename extension must match a supported document or audio content type")
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 bucket configuration is missing")
    if bool(settings.s3_access_key_id) != bool(settings.s3_secret_access_key):
        raise RuntimeError("Configure both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY")

    object_key = f"users/{user_id}/documents/{uuid4().hex}{suffix}"
    client_options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_public_endpoint_url or settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4",
            s3={"addressing_style": settings.s3_addressing_style},
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        client_options["aws_access_key_id"] = settings.s3_access_key_id
        client_options["aws_secret_access_key"] = settings.s3_secret_access_key

    async with _session.client(**client_options) as client:
        upload_url = await client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket_name,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=settings.s3_presigned_url_expires_seconds,
        )

    return {
        "upload_url": upload_url,
        "object_key": object_key,
        "method": "PUT",
        "expires_in": settings.s3_presigned_url_expires_seconds,
        "content_type": content_type,
    }
