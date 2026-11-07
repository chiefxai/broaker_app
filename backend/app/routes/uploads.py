"""Upload URL routes."""

from botocore.exceptions import BotoCoreError
from fastapi import APIRouter, HTTPException, status

from app.auth.dependencies import CurrentUser
from app.schemas.uploads import PresignUploadRequest, PresignUploadResponse
from app.services.uploads import create_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post(
    "/presign",
    response_model=PresignUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Create a direct-to-object-storage document upload URL",
)
async def presign_document_upload(
    payload: PresignUploadRequest,
    user: CurrentUser,
) -> PresignUploadResponse:
    try:
        result = await create_upload(
            user_id=user["sub"],
            filename=payload.filename,
            content_type=payload.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Object storage is not configured") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=503, detail="Unable to create upload URL") from exc
    return PresignUploadResponse(**result)
