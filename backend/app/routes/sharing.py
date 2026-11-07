"""Authenticated share-link management and allowlisted public listing route."""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from redis.exceptions import RedisError
from sqlalchemy import func, select, text

from app.auth.dependencies import AccountUser, DatabaseSession, OptionalAccountUser
from app.config.redis import get_redis_client
from app.core.config import get_settings
from app.models import (
    BrokerProfile,
    BusinessProfile,
    ProfileShareLink,
    Property,
    PropertyCategory,
    PropertyDocument,
    PropertyFeatures,
    PropertyFinancials,
    PropertyLocation,
    PropertyUtility,
    PropertyWaterSource,
    ShareLink,
    UserPreference,
)
from app.schemas.sharing import (
    ProfileShareLinkCreate,
    ProfileShareLinkPage,
    ProfileShareLinkPatch,
    ProfileShareLinkRead,
    PublicListingRead,
    PublicProfileShareRead,
    ShareDisclosures,
    ShareLinkCreate,
    ShareLinkPage,
    ShareLinkPatch,
    ShareLinkRead,
)
from app.services.properties import owned_property
from app.services.share_tokens import decrypt_share_token, encrypt_share_token
from app.services.uploads import stream_object, verify_object_exists

private_router = APIRouter(tags=["sharing"])
public_router = APIRouter(tags=["public"])


def token_digest(token: str) -> bytes:
    return hashlib.sha256(token.encode("utf-8")).digest()


def passcode_digest(passcode: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(passcode.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def passcode_matches(passcode: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        salt_hex, digest_hex = encoded.split(":", 1)
        digest = hashlib.scrypt(
            passcode.encode("utf-8"), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


async def require_valid_share_passcode(
    token: str, passcode: str | None, encoded_hash: str | None, client_address: str | None
) -> None:
    if passcode_matches(passcode or "", encoded_hash):
        return
    if client_address:
        client_digest = hashlib.sha256(client_address.encode("utf-8")).hexdigest()
        key = f"share-passcode-fail:{token_digest(token).hex()}:{client_digest}"
        try:
            redis = get_redis_client()
            attempts = await redis.incr(key)
            if attempts == 1:
                await redis.expire(key, 900)
            if attempts > 5:
                raise HTTPException(
                    status_code=429,
                    detail="Too many incorrect passcode attempts. Try again in 15 minutes.",
                    headers={"Retry-After": "900"},
                )
        except RedisError as exc:
            raise HTTPException(
                status_code=503, detail="Unable to verify share passcode right now"
            ) from exc
    raise HTTPException(status_code=401, detail="Enter the correct share passcode")


async def link_for_owner(
    link_id: UUID, account: AccountUser, session: DatabaseSession
) -> ShareLink:
    result = await session.execute(
        select(ShareLink)
        .join(Property, Property.id == ShareLink.property_id)
        .where(ShareLink.id == link_id, Property.owner_user_id == account.id)
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Share link not found")
    return link


def link_read(link: ShareLink, token: str | None = None) -> dict:
    settings = get_settings()
    base = settings.public_api_base_url.rstrip("/")
    recoverable_token = token
    token_ciphertext = getattr(link, "token_ciphertext", None)
    has_encryption_key = bool(settings.share_link_encryption_key.get_secret_value())
    if recoverable_token is None and token_ciphertext and has_encryption_key:
        recoverable_token = decrypt_share_token(
            token_ciphertext, settings.share_link_encryption_key.get_secret_value()
        )
    return {
        "id": link.id,
        "title": link.title,
        "public_url": (
            f"{base}{settings.api_v1_prefix}/public/listings/{recoverable_token}"
            if recoverable_token and getattr(link, "visibility", "unlisted") != "private"
            else None
        ),
        "expires_at": link.expires_at,
        "revoked_at": link.revoked_at,
        "created_at": link.created_at,
        "disclosures": link.disclosures,
        "visibility": getattr(link, "visibility", "unlisted"),
    }


def profile_link_read(link: ProfileShareLink, token: str | None = None) -> dict:
    settings = get_settings()
    recoverable = token
    if (
        recoverable is None
        and link.token_ciphertext
        and settings.share_link_encryption_key.get_secret_value()
    ):
        recoverable = decrypt_share_token(
            link.token_ciphertext, settings.share_link_encryption_key.get_secret_value()
        )
    return {
        "id": link.id,
        "title": link.title,
        "include_profile": link.include_profile,
        "include_properties": link.include_properties,
        "property_ids": getattr(link, "property_ids", None),
        "property_disclosures": getattr(link, "property_disclosures", {}) or {},
        "visibility": link.visibility,
        "public_url": (
            f"{settings.public_api_base_url.rstrip('/')}{settings.api_v1_prefix}/public/profiles/{recoverable}"
            if recoverable
            else None
        ),
        "expires_at": link.expires_at,
        "revoked_at": link.revoked_at,
        "created_at": link.created_at,
    }


async def validate_profile_property_disclosures(
    session: DatabaseSession,
    owner_user_id: UUID,
    disclosures: dict[UUID, ShareDisclosures] | None,
) -> dict[str, dict]:
    if not disclosures:
        return {}
    property_ids = set(disclosures)
    active_ids = set(
        (
            await session.execute(
                select(Property.id).where(
                    Property.owner_user_id == owner_user_id,
                    Property.status == "active",
                    Property.id.in_(property_ids),
                )
            )
        )
        .scalars()
        .all()
    )
    if active_ids != property_ids:
        raise HTTPException(
            status_code=422,
            detail=(
                "Per-property disclosures must reference active properties owned by this account"
            ),
        )
    return {str(property_id): value.model_dump() for property_id, value in disclosures.items()}


async def validate_profile_property_ids(
    session: DatabaseSession, owner_user_id: UUID, property_ids: list[UUID] | None
) -> list[str] | None:
    if property_ids is None:
        return None
    ids = set(property_ids)
    active_ids = set(
        (
            await session.execute(
                select(Property.id).where(
                    Property.owner_user_id == owner_user_id,
                    Property.status == "active",
                    Property.id.in_(ids),
                )
            )
        )
        .scalars()
        .all()
    )
    if active_ids != ids:
        raise HTTPException(
            status_code=422,
            detail="Grouped links must reference active properties owned by this account",
        )
    return [str(property_id) for property_id in property_ids]


@private_router.get("/profile/share-links", response_model=ProfileShareLinkPage)
async def list_profile_share_links(
    account: AccountUser,
    session: DatabaseSession,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict:
    total = (
        await session.execute(
            select(func.count())
            .select_from(ProfileShareLink)
            .where(ProfileShareLink.owner_user_id == account.id)
        )
    ).scalar_one()
    links = (
        (
            await session.execute(
                select(ProfileShareLink)
                .where(ProfileShareLink.owner_user_id == account.id)
                .order_by(ProfileShareLink.created_at.desc(), ProfileShareLink.id)
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    return {
        "items": [profile_link_read(link) for link in links],
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@private_router.post("/profile/share-links", response_model=ProfileShareLinkRead, status_code=201)
async def create_profile_share_link(
    payload: ProfileShareLinkCreate, account: AccountUser, session: DatabaseSession
) -> dict:
    token = secrets.token_urlsafe(32)
    settings = get_settings()
    key = settings.share_link_encryption_key.get_secret_value()
    property_disclosures = await validate_profile_property_disclosures(
        session, account.id, payload.property_disclosures
    )
    property_ids = await validate_profile_property_ids(session, account.id, payload.property_ids)
    if property_ids is not None and not payload.include_properties:
        raise HTTPException(status_code=422, detail="property_ids require include_properties")
    link = ProfileShareLink(
        owner_user_id=account.id,
        token_hash=token_digest(token),
        token_ciphertext=encrypt_share_token(token, key) if key else None,
        title=payload.title.strip(),
        include_profile=payload.include_profile,
        include_properties=payload.include_properties,
        property_disclosures=property_disclosures,
        property_ids=property_ids,
        visibility=payload.visibility,
        passcode_hash=passcode_digest(payload.passcode.get_secret_value())
        if payload.passcode
        else None,
        expires_at=payload.expires_at,
    )
    session.add(link)
    await session.flush()
    return profile_link_read(link, token)


@private_router.patch(
    "/profile/share-links/{share_link_id}", response_model=ProfileShareLinkRead
)
async def update_profile_share_link(
    share_link_id: UUID,
    payload: ProfileShareLinkPatch,
    account: AccountUser,
    session: DatabaseSession,
) -> dict:
    link = (
        await session.execute(
            select(ProfileShareLink).where(
                ProfileShareLink.id == share_link_id,
                ProfileShareLink.owner_user_id == account.id,
            )
        )
    ).scalar_one_or_none()
    if link is None or link.revoked_at is not None:
        raise HTTPException(status_code=404, detail="Profile share link not found")

    include_profile = (
        payload.include_profile
        if payload.include_profile is not None
        else link.include_profile
    )
    include_properties = (
        payload.include_properties
        if payload.include_properties is not None
        else link.include_properties
    )
    if not include_profile and not include_properties:
        raise HTTPException(status_code=422, detail="Select profile details, properties, or both")

    visibility = payload.visibility or link.visibility
    if visibility == "protected" and link.visibility != "protected" and payload.passcode is None:
        raise HTTPException(status_code=422, detail="Protected links require a numeric passcode")
    if visibility == "unlisted" and payload.passcode is not None:
        raise HTTPException(status_code=422, detail="Passcode is only valid for protected links")

    if payload.title is not None:
        link.title = payload.title
    link.include_profile = include_profile
    link.include_properties = include_properties
    link.visibility = visibility
    if (
        "property_disclosures" in payload.model_fields_set
        and payload.property_disclosures is not None
    ):
        link.property_disclosures = await validate_profile_property_disclosures(
            session, account.id, payload.property_disclosures
        )
    if "property_ids" in payload.model_fields_set:
        if not include_properties:
            raise HTTPException(status_code=422, detail="property_ids require include_properties")
        link.property_ids = await validate_profile_property_ids(
            session, account.id, payload.property_ids
        )
    if "expires_at" in payload.model_fields_set:
        link.expires_at = payload.expires_at
    if visibility == "unlisted":
        link.passcode_hash = None
    elif payload.passcode is not None:
        link.passcode_hash = passcode_digest(payload.passcode.get_secret_value())

    await session.flush()
    return profile_link_read(link)


@private_router.delete("/profile/share-links/{share_link_id}", status_code=204)
async def revoke_profile_share_link(
    share_link_id: UUID, account: AccountUser, session: DatabaseSession
) -> Response:
    link = (
        await session.execute(
            select(ProfileShareLink).where(
                ProfileShareLink.id == share_link_id, ProfileShareLink.owner_user_id == account.id
            )
        )
    ).scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Profile share link not found")
    if link.revoked_at is None:
        link.revoked_at = datetime.now(UTC)
        await session.flush()
    return Response(status_code=204)


async def active_profile_share(
    token: str, session: DatabaseSession, passcode: str | None, client_address: str | None
) -> ProfileShareLink:
    link = (
        await session.execute(
            select(ProfileShareLink).where(ProfileShareLink.token_hash == token_digest(token))
        )
    ).scalar_one_or_none()
    now = datetime.now(UTC)
    if (
        link is None
        or link.revoked_at is not None
        or (link.expires_at is not None and link.expires_at <= now)
    ):
        raise HTTPException(status_code=404, detail="Profile share link not found")
    if link.visibility == "protected":
        await require_valid_share_passcode(token, passcode, link.passcode_hash, client_address)
    return link


@public_router.get(
    "/public/profiles/{token}",
    response_model=PublicProfileShareRead,
    response_model_exclude_none=True,
    openapi_extra={"security": []},
)
async def public_profile_share(
    token: str,
    session: DatabaseSession,
    response: Response,
    request: Request,
    x_share_passcode: str | None = Header(default=None, alias="X-Share-Passcode"),
) -> dict:
    link = await active_profile_share(
        token, session, x_share_passcode, request.client.host if request.client else None
    )
    result: dict = {}
    if link.include_profile:
        business = await session.get(BusinessProfile, link.owner_user_id)
        broker = await session.get(BrokerProfile, link.owner_user_id)
        profile = {
            "business_name": business.business_name if business else None,
            "professional_title": broker.designation if broker else None,
            "public_phone": business.public_phone if business else None,
            "public_email": business.public_email if business else None,
            "city": business.city if business else None,
            "district": business.district if business else None,
            "state": business.state if business else None,
        }
        result["profile"] = profile if any(profile.values()) else None
    if link.include_properties:
        properties = (
            (
                await session.execute(
                    select(Property)
                    .where(
                        Property.owner_user_id == link.owner_user_id, Property.status == "active"
                    )
                    .where(
                        Property.id.in_([UUID(value) for value in link.property_ids])
                        if getattr(link, "property_ids", None) is not None
                        else text("true")
                    )
                    .order_by(Property.created_at.desc())
                )
            )
            .scalars()
            .all()
        )
        public_properties = []
        for prop in properties:
            category = await session.get(PropertyCategory, prop.primary_category_id)
            financials = await session.get(PropertyFinancials, prop.id)
            location = await session.get(PropertyLocation, prop.id)
            public_properties.append(
                {
                    "public_listing_token": f"{token}~{prop.id}",
                    "title": prop.title,
                    "description": prop.description,
                    "category": category.code if category else "unknown",
                    "asking_price_inr": financials.asking_price_inr if financials else None,
                    "area": financials.area if financials else None,
                    "area_unit": financials.area_unit if financials else None,
                    "approximate_location": ", ".join(
                        x for x in (location.district, location.state) if x
                    )
                    if location
                    else None,
                }
            )
        result["properties"] = public_properties
    response.headers["Cache-Control"] = "no-store"
    return result


@private_router.get("/properties/{property_id}/share-links", response_model=ShareLinkPage)
async def list_share_links(
    property_id: UUID,
    account: AccountUser,
    session: DatabaseSession,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict:
    await owned_property(session, property_id, account.id)
    total = (
        await session.execute(
            select(func.count()).select_from(ShareLink).where(ShareLink.property_id == property_id)
        )
    ).scalar_one()
    links = (
        (
            await session.execute(
                select(ShareLink)
                .where(ShareLink.property_id == property_id)
                .order_by(ShareLink.created_at.desc(), ShareLink.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    return {
        "items": [link_read(link) for link in links],
        "limit": limit,
        "offset": offset,
        "total": total,
    }


@private_router.post(
    "/properties/{property_id}/share-links", response_model=ShareLinkRead, status_code=201
)
async def create_share_link(
    property_id: UUID, payload: ShareLinkCreate, account: AccountUser, session: DatabaseSession
) -> dict:
    prop = await owned_property(session, property_id, account.id)
    if prop.status == "archived":
        raise HTTPException(status_code=409, detail="Archived properties cannot be shared")
    if payload.expires_at is not None and payload.expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=422, detail="expires_at must be in the future")
    token = secrets.token_urlsafe(32)
    settings = get_settings()
    link = ShareLink(
        property_id=property_id,
        created_by_user_id=account.id,
        token_hash=token_digest(token),
        token_ciphertext=encrypt_share_token(
            token, settings.share_link_encryption_key.get_secret_value()
        ),
        title=payload.title,
        visibility=payload.visibility,
        passcode_hash=(
            passcode_digest(payload.passcode.get_secret_value()) if payload.passcode else None
        ),
        expires_at=payload.expires_at,
        disclosures=payload.disclosures.model_dump(),
    )
    session.add(link)
    await session.flush()
    await session.refresh(link)
    return link_read(link, token)


@private_router.get("/share-links/{share_link_id}", response_model=ShareLinkRead)
async def get_share_link(
    share_link_id: UUID, account: AccountUser, session: DatabaseSession
) -> dict:
    return link_read(await link_for_owner(share_link_id, account, session))


@private_router.patch("/share-links/{share_link_id}", response_model=ShareLinkRead)
async def patch_share_link(
    share_link_id: UUID, payload: ShareLinkPatch, account: AccountUser, session: DatabaseSession
) -> dict:
    link = await link_for_owner(share_link_id, account, session)
    changes = payload.model_dump(exclude_unset=True, exclude={"passcode"})
    if (
        "expires_at" in changes
        and changes["expires_at"] is not None
        and changes["expires_at"] <= datetime.now(UTC)
    ):
        raise HTTPException(status_code=422, detail="expires_at must be in the future")
    if payload.disclosures is not None:
        changes["disclosures"] = payload.disclosures.model_dump()
    next_visibility = payload.visibility or getattr(link, "visibility", "unlisted")
    if next_visibility == "protected":
        if payload.passcode is not None:
            passcode = payload.passcode.get_secret_value()
            if not passcode.isdigit():
                raise HTTPException(status_code=422, detail="passcode must contain only digits")
            changes["passcode_hash"] = passcode_digest(passcode)
        elif getattr(link, "passcode_hash", None) is None:
            raise HTTPException(
                status_code=422, detail="A passcode is required for protected links"
            )
    else:
        changes["passcode_hash"] = None
    for key, value in changes.items():
        setattr(link, key, value)
    await session.flush()
    await session.refresh(link)
    return link_read(link)


@private_router.delete("/share-links/{share_link_id}", status_code=204)
async def revoke_share_link(
    share_link_id: UUID, account: AccountUser, session: DatabaseSession
) -> None:
    link = await link_for_owner(share_link_id, account, session)
    link.revoked_at = datetime.now(UTC)
    await session.flush()


async def active_public_link(
    token: str,
    session: DatabaseSession,
    passcode: str | None = None,
    client_address: str | None = None,
    account: OptionalAccountUser = None,
) -> tuple[ShareLink, Property]:
    if len(token) > 128:
        raise HTTPException(status_code=404, detail="Listing not found")
    if "~" in token:
        profile_token, raw_property_id = token.rsplit("~", 1)
        try:
            property_id = UUID(raw_property_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Listing not found") from exc
        profile_link = await active_profile_share(
            profile_token, session, passcode, client_address
        )
        if not profile_link.include_properties:
            raise HTTPException(status_code=404, detail="Listing not found")
        prop = (
            await session.execute(
                select(Property).where(
                    Property.id == property_id,
                    Property.owner_user_id == profile_link.owner_user_id,
                    Property.status == "active",
                )
            )
        ).scalar_one_or_none()
        if prop is None:
            raise HTTPException(status_code=404, detail="Listing not found")
        property_disclosures = getattr(profile_link, "property_disclosures", {}) or {}
        property_override = property_disclosures.get(str(property_id))
        if property_override is not None:
            disclosures = ShareDisclosures.model_validate(property_override).model_dump()
        else:
            preferences = await session.get(UserPreference, profile_link.owner_user_id)
            disclosures = ShareDisclosures.model_validate(
                preferences.default_disclosures if preferences else {}
            ).model_dump()
        return SimpleNamespace(disclosures=disclosures), prop
    result = await session.execute(
        select(ShareLink).where(ShareLink.token_hash == token_digest(token))
    )
    link = result.scalar_one_or_none()
    now = datetime.now(UTC)
    if (
        link is None
        or link.revoked_at is not None
        or (link.expires_at is not None and link.expires_at <= now)
    ):
        raise HTTPException(status_code=404, detail="Listing not found")
    visibility = getattr(link, "visibility", "unlisted")
    prop = await session.get(Property, link.property_id)
    if prop is None or prop.status == "archived":
        raise HTTPException(status_code=404, detail="Listing not found")
    if visibility == "private":
        if account is None:
            raise HTTPException(status_code=401, detail="Sign in to view this private share link")
        if prop.owner_user_id != account.id:
            raise HTTPException(status_code=404, detail="Listing not found")
    if visibility == "protected":
        await require_valid_share_passcode(
            token, passcode, getattr(link, "passcode_hash", None), client_address
        )
    return link, prop


def public_document_url(token: str, document_id: UUID) -> str:
    settings = get_settings()
    return (
        f"{settings.public_api_base_url.rstrip('/')}{settings.api_v1_prefix}"
        f"/public/listings/{token}/documents/{document_id}"
    )


@public_router.get(
    "/public/listings/{token}",
    response_model=PublicListingRead,
    response_model_exclude_unset=True,
    openapi_extra={"security": []},
)
async def public_listing(
    token: str,
    session: DatabaseSession,
    response: Response,
    request: Request,
    account: OptionalAccountUser = None,
    x_share_passcode: str | None = Header(default=None, alias="X-Share-Passcode"),
) -> dict:
    client_address = request.client.host if request.client else None
    link, prop = await active_public_link(token, session, x_share_passcode, client_address, account)
    disclosures = link.disclosures or {}
    result_data: dict = {}

    if disclosures.get("show_name", True):
        result_data["title"] = prop.title
    if disclosures.get("show_description", True):
        result_data["description"] = prop.description

    legacy_disclosures = "show_specifications" not in disclosures
    show_specifications = disclosures.get(
        "show_specifications", disclosures.get("show_price", False)
    )
    if show_specifications or legacy_disclosures:
        category = await session.get(PropertyCategory, prop.primary_category_id)
        category_code = category.code if category else "unknown"
        if legacy_disclosures:
            result_data["category"] = category_code
        specifications: dict = {"category": category_code} if show_specifications else {}
        finance = await session.get(PropertyFinancials, prop.id)
        if finance and show_specifications:
            specifications["area"] = finance.area
            specifications["area_unit"] = finance.area_unit
        features = await session.get(PropertyFeatures, prop.id)
        if features:
            specifications.update(
                {
                    "soil_type": features.soil_type,
                    "soil_type_other": features.soil_type_other,
                    "water_tds_ppm": features.water_tds_ppm,
                    "agronomist_notes": features.agronomist_notes,
                }
            )
            water_sources = (
                (
                    await session.execute(
                        select(PropertyWaterSource).where(
                            PropertyWaterSource.property_id == prop.id
                        )
                    )
                )
                .scalars()
                .all()
            )
            specifications["water_sources"] = [
                {
                    "source_type": item.source_type,
                    "label": item.label,
                    "depth_ft": item.depth_ft,
                    "diameter_ft": item.diameter_ft,
                    "yield_inches": item.yield_inches,
                    "seasonality": item.seasonality,
                    "details": item.details,
                }
                for item in water_sources
            ]
            utilities = (
                (
                    await session.execute(
                        select(PropertyUtility).where(PropertyUtility.property_id == prop.id)
                    )
                )
                .scalars()
                .all()
            )
            specifications["utilities"] = [
                {
                    "utility_type": item.utility_type,
                    "available": item.available,
                    "details": item.details,
                }
                for item in utilities
            ]
        if show_specifications:
            result_data["specifications"] = specifications

    if disclosures.get("show_price"):
        finance = await session.get(PropertyFinancials, prop.id)
        result_data["asking_price_inr"] = finance.asking_price_inr if finance else None

    location = await session.get(PropertyLocation, prop.id)
    if location and disclosures.get("show_location", True):
        result_data["approximate_location"] = (
            ", ".join(x for x in (location.district, location.state) if x) or None
        )
        if disclosures.get("show_exact_coordinates"):
            result_data["latitude"] = location.latitude
            result_data["longitude"] = location.longitude
        if disclosures.get("show_approach_roads"):
            result_data["road_access_type"] = location.road_access_type
            result_data["road_width_ft"] = location.road_width_ft

    if disclosures.get("show_broker_contact"):
        business = await session.get(BusinessProfile, prop.owner_user_id)
        if business is not None:
            contact = {
                "business_name": business.business_name,
                "public_phone": business.public_phone,
                "public_email": business.public_email,
                "city": business.city,
                "district": business.district,
                "state": business.state,
            }
            if any(value for value in contact.values()):
                result_data["broker_contact"] = contact

    categories: set[str] = set()
    if disclosures.get("show_photos"):
        categories.add("photo")
    if disclosures.get("show_documents"):
        categories.update({"survey", "soil_report", "other"})
    if disclosures.get("show_reports"):
        categories.update({"survey", "soil_report"})

    if categories:
        rows = (
            (
                await session.execute(
                    select(PropertyDocument)
                    .where(
                        PropertyDocument.property_id == prop.id,
                        PropertyDocument.category.in_(categories),
                        PropertyDocument.visibility.in_(["shared", "public"]),
                        PropertyDocument.upload_status == "uploaded",
                        PropertyDocument.deleted_at.is_(None),
                    )
                    .order_by(PropertyDocument.created_at.asc())
                )
            )
            .scalars()
            .all()
        )
        media, reports, client_documents = [], [], []
        for document in rows:
            entry = {
                "url": public_document_url(token, document.id),
                "name": document.display_name or document.original_filename,
            }
            if document.category == "photo":
                media.append(entry)
            elif document.category in {"survey", "soil_report"}:
                if disclosures.get("show_reports"):
                    reports.append(entry)
                if disclosures.get("show_documents"):
                    client_documents.append({**entry, "category": document.category})
            elif disclosures.get("show_documents"):
                client_documents.append({**entry, "category": document.category})
        if disclosures.get("show_photos"):
            result_data["media"] = media
        if disclosures.get("show_reports"):
            result_data["reports"] = reports
        if disclosures.get("show_documents"):
            result_data["documents"] = client_documents

    response.headers["Cache-Control"] = "no-store"
    return result_data


@public_router.get(
    "/public/listings/{token}/documents/{document_id}",
    openapi_extra={"security": []},
)
async def public_listing_document(
    token: str,
    document_id: UUID,
    session: DatabaseSession,
    request: Request,
    account: OptionalAccountUser = None,
    x_share_passcode: str | None = Header(default=None, alias="X-Share-Passcode"),
) -> StreamingResponse:
    client_address = request.client.host if request.client else None
    link, prop = await active_public_link(token, session, x_share_passcode, client_address, account)
    result = await session.execute(
        select(PropertyDocument).where(
            PropertyDocument.id == document_id,
            PropertyDocument.property_id == prop.id,
            PropertyDocument.deleted_at.is_(None),
            PropertyDocument.upload_status == "uploaded",
            PropertyDocument.visibility.in_(["shared", "public"]),
        )
    )
    document = result.scalar_one_or_none()
    disclosures = link.disclosures or {}
    allowed = document is not None and (
        (document.category == "photo" and disclosures.get("show_photos"))
        or (
            document.category in {"survey", "soil_report"}
            and (disclosures.get("show_documents") or disclosures.get("show_reports"))
        )
        or (document.category == "other" and disclosures.get("show_documents"))
    )
    if not allowed or document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        await verify_object_exists(document.object_key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
            raise HTTPException(status_code=404, detail="Document not found") from exc
        raise HTTPException(status_code=503, detail="Unable to retrieve shared document") from exc
    except (BotoCoreError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Unable to retrieve shared document") from exc
    return StreamingResponse(
        stream_object(document.object_key),
        media_type=document.content_type,
        headers={"Cache-Control": "no-store", "Content-Disposition": "inline"},
    )
