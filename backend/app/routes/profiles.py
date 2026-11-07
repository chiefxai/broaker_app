"""Broker account, preferences, and onboarding routes."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from app.auth.dependencies import AccountUser, DatabaseSession
from app.models import BrokerProfile, BusinessProfile, OnboardingProgress, UserPreference
from app.schemas.profiles import (
    BrokerProfileInput,
    BrokerProfilePatch,
    BrokerProfileRead,
    BusinessProfileInput,
    BusinessProfilePatch,
    BusinessProfileRead,
    OnboardingProgressPatch,
    OnboardingProgressRead,
    UserPreferencesPatch,
    UserPreferencesRead,
)
from app.services.accounts import get_or_create, patch_account_row, profile_or_none

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/broker", response_model=BrokerProfileRead)
async def get_broker_profile(account: AccountUser, session: DatabaseSession) -> dict:
    profile = await profile_or_none(session, BrokerProfile, account.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Broker profile not found")
    return {
        **{k: getattr(profile, k) for k in BrokerProfileInput.model_fields},
        "account_email": account.account_email,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.put("/broker", response_model=BrokerProfileRead)
async def put_broker_profile(
    payload: BrokerProfileInput, account: AccountUser, session: DatabaseSession
) -> dict:
    profile = await get_or_create(session, BrokerProfile, account.id)
    await patch_account_row(session, profile, payload.model_dump())
    return {
        **payload.model_dump(),
        "account_email": account.account_email,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.patch("/broker", response_model=BrokerProfileRead)
async def patch_broker_profile(
    payload: BrokerProfilePatch, account: AccountUser, session: DatabaseSession
) -> dict:
    profile = await profile_or_none(session, BrokerProfile, account.id)
    if profile is None:
        raise HTTPException(
            status_code=404, detail="Broker profile not found; use PUT to create it"
        )
    await patch_account_row(session, profile, payload.model_dump(exclude_unset=True))
    return {
        **{k: getattr(profile, k) for k in BrokerProfileInput.model_fields},
        "account_email": account.account_email,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.get("/business", response_model=BusinessProfileRead)
async def get_business_profile(account: AccountUser, session: DatabaseSession) -> BusinessProfile:
    profile = await profile_or_none(session, BusinessProfile, account.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return profile


@router.put("/business", response_model=BusinessProfileRead)
async def put_business_profile(
    payload: BusinessProfileInput, account: AccountUser, session: DatabaseSession
) -> BusinessProfile:
    profile = await get_or_create(session, BusinessProfile, account.id)
    await patch_account_row(session, profile, payload.model_dump())
    return profile


@router.patch("/business", response_model=BusinessProfileRead)
async def patch_business_profile(
    payload: BusinessProfilePatch, account: AccountUser, session: DatabaseSession
) -> BusinessProfile:
    profile = await get_or_create(session, BusinessProfile, account.id)
    await patch_account_row(session, profile, payload.model_dump(exclude_unset=True))
    return profile


@router.get("/preferences", response_model=UserPreferencesRead)
async def get_preferences(account: AccountUser, session: DatabaseSession) -> UserPreference:
    return await get_or_create(
        session,
        UserPreference,
        account.id,
        default_disclosures={},
        default_expiration_days=None,
    )


@router.patch("/preferences", response_model=UserPreferencesRead)
async def patch_preferences(
    payload: UserPreferencesPatch, account: AccountUser, session: DatabaseSession
) -> UserPreference:
    row = await get_or_create(
        session,
        UserPreference,
        account.id,
        default_disclosures={},
        default_expiration_days=None,
    )
    changes = payload.model_dump(exclude_unset=True)
    if payload.default_disclosures is not None:
        changes["default_disclosures"] = payload.default_disclosures.model_dump()
    await patch_account_row(session, row, changes)
    return row


@router.get("/onboarding", response_model=OnboardingProgressRead)
async def get_onboarding(account: AccountUser, session: DatabaseSession) -> OnboardingProgressRead:
    row = await get_or_create(session, OnboardingProgress, account.id, completed_steps=[])
    return OnboardingProgressRead(
        completed=row.completed_at is not None,
        current_step=row.current_step,
        completed_steps=row.completed_steps,
    )


@router.patch("/onboarding", response_model=OnboardingProgressRead)
async def patch_onboarding(
    payload: OnboardingProgressPatch, account: AccountUser, session: DatabaseSession
) -> OnboardingProgressRead:
    row = await get_or_create(session, OnboardingProgress, account.id, completed_steps=[])
    changes = payload.model_dump(exclude_unset=True)
    if "completed_steps" in changes and changes["completed_steps"] is not None:
        changes["completed_steps"] = list(dict.fromkeys(changes["completed_steps"]))
    if changes.get("current_step") == "complete":
        changes["completed_at"] = datetime.now(UTC)
    await patch_account_row(session, row, changes)
    return OnboardingProgressRead(
        completed=row.completed_at is not None,
        current_step=row.current_step,
        completed_steps=row.completed_steps,
    )
