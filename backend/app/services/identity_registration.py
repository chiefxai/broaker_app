"""Provider-specific public account registration."""

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas.auth import RegistrationRequest


async def register_keycloak_user(
    payload: RegistrationRequest,
    settings: Settings,
    transport: httpx.AsyncBaseTransport | None = None,
) -> None:
    """Create an account with a least-privilege Keycloak service account.

    The service account needs realm-management/manage-users. It is only used by
    this backend and is never sent to or bundled with the mobile app.
    """
    issuer = settings.keycloak_issuer.rstrip("/")
    client_id = settings.keycloak_registration_client_id.strip()
    client_secret = settings.keycloak_registration_client_secret
    if (
        settings.auth_provider != "keycloak"
        or not issuer
        or not client_id
        or not client_secret
    ):
        raise HTTPException(status_code=503, detail="Keycloak registration is not configured.")

    realm = issuer.rsplit("/realms/", 1)[-1]
    if realm == issuer or not realm or "/" in realm:
        raise HTTPException(status_code=503, detail="Keycloak issuer is not configured correctly.")

    admin_base_url = settings.keycloak_admin_base_url.strip().rstrip("/")
    if not admin_base_url:
        admin_base_url = issuer.split("/realms/", 1)[0]
    realm_url = f"{admin_base_url}/realms/{realm}"
    timeout = httpx.Timeout(10.0, connect=3.0)
    async with httpx.AsyncClient(timeout=timeout, transport=transport) as client:
        try:
            token_response = await client.post(
                f"{realm_url}/protocol/openid-connect/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Accept": "application/json"},
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=503, detail="Identity provider is unavailable."
            ) from exc
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=503, detail="Keycloak registration service is unavailable."
            )
        try:
            token_body = token_response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=503,
                detail="Keycloak registration service is unavailable.",
            ) from exc
        access_token = token_body.get("access_token") if isinstance(token_body, dict) else None
        if not isinstance(access_token, str) or not access_token:
            raise HTTPException(
                status_code=503, detail="Keycloak registration service is unavailable."
            )

        first_name, _, last_name = payload.full_name.strip().partition(" ")
        email = str(payload.email).strip().lower()
        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        representation = {
            "username": email,
            "email": email,
            "emailVerified": False,
            "enabled": True,
            "firstName": first_name,
            "lastName": last_name or None,
            "attributes": {"phone_number": [payload.phone_number.strip()]},
            "credentials": [{
                "type": "password",
                "value": payload.password.get_secret_value(),
                "temporary": False,
            }],
        }
        try:
            created = await client.post(
                f"{admin_base_url}/admin/realms/{realm}/users",
                json=representation,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=503, detail="Identity provider is unavailable."
            ) from exc
        if created.status_code == 409:
            raise HTTPException(
                status_code=409, detail="An account with this email already exists."
            )
        if created.status_code not in (201, 204):
            raise HTTPException(
                status_code=503, detail="Keycloak registration service is unavailable."
            )
