"""Business logic for authenticated direct-to-object-storage uploads."""

from collections.abc import AsyncIterator
from pathlib import PurePosixPath
from uuid import uuid4

import aioboto3
from botocore.config import Config

from app.config.object_storage import create_document_upload_url
from app.core.config import get_settings


async def create_upload(*, user_id: str, filename: str, content_type: str) -> dict[str, str | int]:
    return await create_document_upload_url(
        user_id=user_id,
        filename=filename,
        content_type=content_type,
    )


async def create_property_upload(
    *, subject: str, property_id: str, filename: str, content_type: str
) -> dict[str, str | int]:
    settings = get_settings()
    suffix = PurePosixPath(filename).suffix.lower()
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 bucket configuration is missing")
    if bool(settings.s3_access_key_id) != bool(settings.s3_secret_access_key):
        raise RuntimeError("Configure both S3 access keys")
    key = f"users/{subject}/properties/{property_id}/documents/{uuid4().hex}{suffix}"
    options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_public_endpoint_url or settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4", s3={"addressing_style": settings.s3_addressing_style}
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        options["aws_access_key_id"] = settings.s3_access_key_id
        options["aws_secret_access_key"] = settings.s3_secret_access_key
    async with aioboto3.Session().client(**options) as client:
        url = await client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket_name,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=settings.s3_presigned_url_expires_seconds,
        )
    return {
        "upload_url": url,
        "object_key": key,
        "method": "PUT",
        "expires_in": settings.s3_presigned_url_expires_seconds,
        "content_type": content_type,
    }


async def create_download_url(object_key: str) -> tuple[str, int]:
    settings = get_settings()
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 bucket configuration is missing")
    options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_public_endpoint_url or settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4", s3={"addressing_style": settings.s3_addressing_style}
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        options["aws_access_key_id"] = settings.s3_access_key_id
        options["aws_secret_access_key"] = settings.s3_secret_access_key
    async with aioboto3.Session().client(**options) as client:
        url = await client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": object_key},
            ExpiresIn=settings.s3_presigned_url_expires_seconds,
        )
    return url, settings.s3_presigned_url_expires_seconds


def stream_object(object_key: str) -> AsyncIterator[bytes]:
    """Stream a private object without issuing a bearer presigned URL to a public client."""
    settings = get_settings()
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 bucket configuration is missing")
    options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4", s3={"addressing_style": settings.s3_addressing_style}
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        options["aws_access_key_id"] = settings.s3_access_key_id
        options["aws_secret_access_key"] = settings.s3_secret_access_key

    async def chunks() -> AsyncIterator[bytes]:
        async with aioboto3.Session().client(**options) as client:
            result = await client.get_object(Bucket=settings.s3_bucket_name, Key=object_key)
            body = result["Body"]
            try:
                while chunk := await body.read(64 * 1024):
                    yield chunk
            finally:
                body.close()

    return chunks()


async def verify_object_exists(object_key: str) -> dict:
    settings = get_settings()
    if not settings.s3_bucket_name:
        raise RuntimeError("S3 bucket configuration is missing")
    options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4", s3={"addressing_style": settings.s3_addressing_style}
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        options["aws_access_key_id"] = settings.s3_access_key_id
        options["aws_secret_access_key"] = settings.s3_secret_access_key
    async with aioboto3.Session().client(**options) as client:
        return await client.head_object(Bucket=settings.s3_bucket_name, Key=object_key)


def _matches_upload_signature(content_type: str, prefix: bytes) -> bool:
    """Reject common extension/MIME spoofing before a document is registered."""
    if content_type == "application/pdf":
        return prefix.startswith(b"%PDF-")
    if content_type == "image/jpeg":
        return prefix.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return prefix.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(prefix) >= 12 and prefix.startswith(b"RIFF") and prefix[8:12] == b"WEBP"
    if content_type == "audio/mp4":
        # M4A recordings use the ISO Base Media File Format container.
        return len(prefix) >= 12 and prefix[4:8] == b"ftyp"
    if content_type == "audio/aac":
        # ADTS frame sync: 12 one-bits followed by a zero layer field.
        return len(prefix) >= 2 and prefix[0] == 0xFF and prefix[1] & 0xF6 == 0xF0
    if content_type == "audio/mpeg":
        return prefix.startswith(b"ID3") or (
            len(prefix) >= 2 and prefix[0] == 0xFF and prefix[1] & 0xE0 == 0xE0
        )
    if content_type == "audio/wav":
        return len(prefix) >= 12 and prefix.startswith(b"RIFF") and prefix[8:12] == b"WAVE"
    if content_type == "audio/webm":
        return prefix.startswith(b"\x1a\x45\xdf\xa3")
    return False


async def verify_property_upload(
    object_key: str, *, expected_content_type: str, max_size_bytes: int
) -> dict:
    """Verify that a direct upload exists, is bounded, and matches its declared file type."""
    settings = get_settings()
    metadata = await verify_object_exists(object_key)
    size = metadata.get("ContentLength")
    if not isinstance(size, int) or size <= 0:
        raise ValueError("Uploaded file is empty or has invalid size")
    if size > max_size_bytes:
        raise ValueError(f"Uploaded file exceeds the {max_size_bytes}-byte limit")
    if metadata.get("ContentType") != expected_content_type:
        raise ValueError("Uploaded object content type does not match")

    options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4", s3={"addressing_style": settings.s3_addressing_style}
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        options["aws_access_key_id"] = settings.s3_access_key_id
        options["aws_secret_access_key"] = settings.s3_secret_access_key
    async with aioboto3.Session().client(**options) as client:
        response = await client.get_object(
            Bucket=settings.s3_bucket_name, Key=object_key, Range="bytes=0-15"
        )
        async with response["Body"] as body:
            # The Range header bounds this response to at most 16 bytes. aiobotocore's
            # StreamingBody.read() does not accept a size argument.
            prefix = await body.read()
    if not _matches_upload_signature(expected_content_type, prefix):
        raise ValueError("Uploaded file contents do not match the declared content type")
    return metadata


async def delete_object(object_key: str) -> None:
    settings = get_settings()
    options: dict[str, object] = {
        "service_name": "s3",
        "region_name": settings.s3_region,
        "endpoint_url": settings.s3_endpoint_url or None,
        "config": Config(
            signature_version="s3v4", s3={"addressing_style": settings.s3_addressing_style}
        ),
    }
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        options["aws_access_key_id"] = settings.s3_access_key_id
        options["aws_secret_access_key"] = settings.s3_secret_access_key
    async with aioboto3.Session().client(**options) as client:
        await client.delete_object(Bucket=settings.s3_bucket_name, Key=object_key)
