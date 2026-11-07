"""Property document metadata and secure storage URL routes."""

from uuid import UUID

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.auth.dependencies import AccountUser, CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.models import Property, PropertyDocument
from app.schemas.documents import (
    DocumentCreate,
    DocumentDownloadUrlRead,
    DocumentPatch,
    DocumentRead,
)
from app.schemas.uploads import PresignUploadRequest, PresignUploadResponse
from app.services.properties import owned_property
from app.services.uploads import (
    create_download_url,
    create_property_upload,
    delete_object,
    verify_property_upload,
)

router = APIRouter(tags=["documents"])


@router.post("/properties/{property_id}/uploads/presign", response_model=PresignUploadResponse)
async def presign_property_upload(
    property_id: UUID,
    payload: PresignUploadRequest,
    user: CurrentUser,
    account: AccountUser,
    session: DatabaseSession,
) -> dict:
    await owned_property(session, property_id, account.id)
    try:
        return await create_property_upload(
            subject=user["sub"],
            property_id=str(property_id),
            filename=payload.filename,
            content_type=payload.content_type,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Object storage is not configured") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=503, detail="Unable to create upload URL") from exc


@router.post("/properties/{property_id}/documents", response_model=DocumentRead, status_code=201)
async def register_document(
    property_id: UUID,
    payload: DocumentCreate,
    user: CurrentUser,
    account: AccountUser,
    session: DatabaseSession,
) -> PropertyDocument:
    await owned_property(session, property_id, account.id)
    expected_prefix = f"users/{user['sub']}/properties/{property_id}/documents/"
    if not payload.object_key.startswith(expected_prefix) or ".." in payload.object_key:
        raise HTTPException(
            status_code=403, detail="Object key is outside this property upload scope"
        )
    try:
        metadata = await verify_property_upload(
            payload.object_key,
            expected_content_type=payload.content_type,
            max_size_bytes=get_settings().s3_max_upload_bytes,
        )
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in {"404", "NoSuchKey", "NotFound"}:
            raise HTTPException(status_code=422, detail="Uploaded object was not found") from exc
        raise HTTPException(status_code=503, detail="Unable to verify uploaded object") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=503, detail="Unable to verify uploaded object") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Object storage is not configured") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    row = PropertyDocument(
        property_id=property_id,
        uploaded_by_user_id=account.id,
        object_key=payload.object_key,
        original_filename=payload.filename,
        display_name=payload.display_name,
        content_type=payload.content_type,
        size_bytes=metadata.get("ContentLength"),
        category=payload.category,
        upload_status="uploaded",
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return row


@router.get("/properties/{property_id}/documents", response_model=list[DocumentRead])
async def list_documents(
    property_id: UUID, account: AccountUser, session: DatabaseSession
) -> list[PropertyDocument]:
    await owned_property(session, property_id, account.id)
    return list(
        (
            await session.execute(
                select(PropertyDocument)
                .where(
                    PropertyDocument.property_id == property_id,
                    PropertyDocument.deleted_at.is_(None),
                )
                .order_by(PropertyDocument.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def document_for_owner(
    document_id: UUID, account: AccountUser, session: DatabaseSession
) -> PropertyDocument:
    result = await session.execute(
        select(PropertyDocument)
        .join(Property, Property.id == PropertyDocument.property_id)
        .where(
            PropertyDocument.id == document_id,
            Property.owner_user_id == account.id,
            PropertyDocument.deleted_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return row


@router.get("/documents/{document_id}/download-url", response_model=DocumentDownloadUrlRead)
async def get_download_url(
    document_id: UUID, account: AccountUser, session: DatabaseSession
) -> dict:
    row = await document_for_owner(document_id, account, session)
    try:
        url, expiry = await create_download_url(row.object_key)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Object storage is not configured") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=503, detail="Unable to create download URL") from exc
    return {"download_url": url, "expires_in": expiry}


@router.patch("/documents/{document_id}", response_model=DocumentRead)
async def patch_document(
    document_id: UUID, payload: DocumentPatch, account: AccountUser, session: DatabaseSession
) -> PropertyDocument:
    row = await document_for_owner(document_id, account, session)
    next_category = payload.category if payload.category is not None else row.category
    next_visibility = payload.visibility if payload.visibility is not None else row.visibility
    if next_category == "voice_memo" and next_visibility != "private":
        raise HTTPException(status_code=422, detail="Voice logs must remain private")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await session.flush()
    await session.refresh(row)
    return row


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document(
    document_id: UUID, account: AccountUser, session: DatabaseSession
) -> Response:
    row = await document_for_owner(document_id, account, session)
    try:
        await delete_object(row.object_key)
    except BotoCoreError as exc:
        raise HTTPException(status_code=503, detail="Could not delete the stored object") from exc
    from datetime import UTC, datetime

    row.deleted_at, row.upload_status = datetime.now(UTC), "deleted"
    await session.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
